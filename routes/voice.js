const express = require('express');
const multer = require('multer');
const WebSocket = require('ws');
const { pool } = require('../config/database');
const voiceService = require('../services/voiceService');
const pythonVoiceProxy = require('../services/pythonVoiceProxy');
const documentProcessor = require('../services/documentProcessor');
const llmService = require('../services/llmService');

const router = express.Router();

// Health check for voice service
router.get('/health', async (req, res) => {
  try {
    // Check both JavaScript and Python services
    let pythonServiceStatus = 'unavailable';
    try {
      const pythonHealth = await pythonVoiceProxy.checkHealth();
      pythonServiceStatus = pythonHealth.status;
    } catch (error) {
      pythonServiceStatus = 'error';
    }

    res.json({
      status: 'OK',
      deepgram: process.env.DEEPGRAM_API_KEY ? 'configured' : 'missing',
      pythonService: pythonServiceStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Voice service health check failed' });
  }
});

// Configure multer for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for audio
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/wav', 
      'audio/mp3', 
      'audio/webm', 
      'audio/ogg', 
      'audio/mp4',
      'audio/mpeg',
      'audio/x-wav',
      'audio/webm;codecs=opus'
    ];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio type: ${file.mimetype}`));
    }
  }
});

// Transcribe audio file
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    console.log('Received audio file:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Try Python service first, fallback to JavaScript service
    let transcription;
    try {
      transcription = await pythonVoiceProxy.transcribeAudio(req.file.buffer);
      console.log('Used Python voice service for transcription');
    } catch (pythonError) {
      console.log('Python service failed, falling back to JavaScript service:', pythonError.message);
      transcription = await voiceService.transcribeAudio(req.file.buffer);
      console.log('Used JavaScript voice service for transcription');
    }
    
    res.json({
      success: true,
      transcript: transcription.transcript,
      confidence: transcription.confidence,
      words: transcription.words
    });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({ 
      error: 'Failed to transcribe audio',
      message: error.message 
    });
  }
});

// Synthesize speech from text
router.post('/synthesize', upload.none(), async (req, res) => {
  try {
    console.log('Synthesize request body:', req.body);
    console.log('Synthesize request headers:', req.headers);
    
    const { text, voice = 'aura-asteria-en', language = 'en' } = req.body;
    
    if (!text || !text.trim()) {
      console.log('Text validation failed:', { text, textType: typeof text });
      return res.status(400).json({ error: 'Text is required' });
    }

    // Map language codes to appropriate voice models
    const voiceModelMap = {
      'en': 'aura-asteria-en',
      'ta': 'aura-asteria-en', // Fallback to English
      'ms': 'aura-asteria-en', // Fallback to English
      'zh': 'aura-asteria-en'  // Fallback to English for now
    };

    const selectedModel = voiceModelMap[language] || voice || 'aura-asteria-en';
    console.log(`Using TTS model: ${selectedModel} for language: ${language}`);

    const audioBuffer = await voiceService.synthesizeSpeech(text, { model: selectedModel });
    
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.length,
      'Content-Disposition': 'attachment; filename="speech.wav"'
    });
    
    res.send(audioBuffer);
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    res.status(500).json({ 
      error: 'Failed to synthesize speech',
      message: error.message 
    });
  }
});

// Voice chat with session
router.post('/chat/:sessionId', upload.single('audio'), async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const client = await pool.connect();
    
    // Get session and section info
    const sessionResult = await client.query(`
      SELECT cs.*, ds.section_title, ds.content, ds.document_id
      FROM chat_sessions cs
      JOIN document_sections ds ON cs.section_id = ds.id
      WHERE cs.id = $1
    `, [sessionId]);
    
    if (sessionResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Chat session not found' });
    }
    
    const session = sessionResult.rows[0];
    
    // Get conversation history
    const historyResult = await client.query(`
      SELECT role, content FROM chat_messages
      WHERE session_id = $1
      ORDER BY timestamp ASC
      LIMIT 20
    `, [sessionId]);
    
    const conversationHistory = historyResult.rows;
    client.release();
    
    // Transcribe audio
    const transcription = await voiceService.transcribeAudio(req.file.buffer);
    const userMessage = transcription.transcript;
    
    if (!userMessage.trim()) {
      return res.status(400).json({ error: 'No speech detected in audio' });
    }
    
    // Save user message
    const client2 = await pool.connect();
    await client2.query(`
      INSERT INTO chat_messages (session_id, role, content)
      VALUES ($1, 'user', $2)
    `, [sessionId, userMessage]);
    client2.release();
    
    // Get relevant context using RAG
    const similarContent = await documentProcessor.searchSimilarContent(
      userMessage, 
      session.document_id, 
      session.section_id,
      3
    );
    
    let context = session.content;
    if (similarContent.length > 0) {
      const additionalContext = similarContent
        .map(chunk => chunk.content)
        .join('\n\n');
      context = `${context}\n\nAdditional relevant content:\n${additionalContext}`;
    }
    
    // Generate AI response
    const aiResponse = await llmService.generateResponse(
      userMessage,
      context,
      session.section_title,
      conversationHistory
    );
    
    // Save AI response
    const client3 = await pool.connect();
    await client3.query(`
      INSERT INTO chat_messages (session_id, role, content)
      VALUES ($1, 'assistant', $2)
    `, [sessionId, aiResponse]);
    
    // Update session activity
    await client3.query(`
      UPDATE chat_sessions 
      SET last_activity = CURRENT_TIMESTAMP, message_count = message_count + 2
      WHERE id = $1
    `, [sessionId]);
    client3.release();
    
    // Synthesize AI response to speech
    const audioBuffer = await voiceService.synthesizeSpeech(aiResponse);
    
    res.json({
      success: true,
      userMessage: userMessage,
      aiResponse: aiResponse,
      transcriptionConfidence: transcription.confidence,
      audioResponse: audioBuffer.toString('base64'),
      relevantChunks: similarContent.length
    });
    
  } catch (error) {
    console.error('Error processing voice chat:', error);
    res.status(500).json({ 
      error: 'Failed to process voice chat',
      message: error.message 
    });
  }
});

// Get available voices
router.get('/voices', (req, res) => {
  const voices = [
    { id: 'aura-asteria-en', name: 'Asteria (Female)', language: 'en-US' },
    { id: 'aura-luna-en', name: 'Luna (Female)', language: 'en-US' },
    { id: 'aura-stella-en', name: 'Stella (Female)', language: 'en-US' },
    { id: 'aura-athena-en', name: 'Athena (Female)', language: 'en-US' },
    { id: 'aura-hera-en', name: 'Hera (Female)', language: 'en-US' },
    { id: 'aura-orion-en', name: 'Orion (Male)', language: 'en-US' },
    { id: 'aura-arcas-en', name: 'Arcas (Male)', language: 'en-US' },
    { id: 'aura-perseus-en', name: 'Perseus (Male)', language: 'en-US' },
    { id: 'aura-angus-en', name: 'Angus (Male)', language: 'en-US' },
    { id: 'aura-orpheus-en', name: 'Orpheus (Male)', language: 'en-US' }
  ];
  
  res.json({
    success: true,
    voices: voices
  });
});

// WebSocket endpoint for real-time voice conversation
function setupVoiceWebSocket(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/api/voice/realtime'
  });

  wss.on('connection', (ws, req) => {
    console.log('Voice WebSocket connection established');
    
    let sessionId = null;
    let voiceConnection = null;
    let sessionData = null;
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'start_session':
            sessionId = data.sessionId;
            
            // Get session data
            const client = await pool.connect();
            const sessionResult = await client.query(`
              SELECT cs.*, ds.section_title, ds.content, ds.document_id
              FROM chat_sessions cs
              JOIN document_sections ds ON cs.section_id = ds.id
              WHERE cs.id = $1
            `, [sessionId]);
            client.release();
            
            if (sessionResult.rows.length === 0) {
              ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
              return;
            }
            
            sessionData = sessionResult.rows[0];
            
            // Setup voice connection
            voiceConnection = voiceService.setupVoiceConversation(
              sessionId,
              async (transcript) => {
                if (transcript.isFinal && transcript.transcript.trim()) {
                  await handleVoiceMessage(transcript.transcript, ws);
                } else {
                  // Send interim results
                  ws.send(JSON.stringify({
                    type: 'interim_transcript',
                    transcript: transcript.transcript,
                    confidence: transcript.confidence
                  }));
                }
              },
              (error) => {
                ws.send(JSON.stringify({ type: 'error', message: error.message }));
              }
            );
            
            ws.send(JSON.stringify({ type: 'session_started', sessionId }));
            break;
            
          case 'audio_data':
            if (voiceConnection) {
              const audioBuffer = Buffer.from(data.audio, 'base64');
              voiceService.sendAudioData(sessionId, audioBuffer);
            }
            break;
            
          case 'end_session':
            if (voiceConnection) {
              voiceService.closeVoiceConnection(sessionId);
            }
            ws.send(JSON.stringify({ type: 'session_ended' }));
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
      }
    });
    
    async function handleVoiceMessage(userMessage, ws) {
      try {
        // Save user message
        const client = await pool.connect();
        await client.query(`
          INSERT INTO chat_messages (session_id, role, content)
          VALUES ($1, 'user', $2)
        `, [sessionId, userMessage]);
        
        // Get conversation history
        const historyResult = await client.query(`
          SELECT role, content FROM chat_messages
          WHERE session_id = $1
          ORDER BY timestamp ASC
          LIMIT 20
        `, [sessionId]);
        client.release();
        
        const conversationHistory = historyResult.rows;
        
        // Get relevant context
        const similarContent = await documentProcessor.searchSimilarContent(
          userMessage, 
          sessionData.document_id, 
          sessionData.section_id,
          3
        );
        
        let context = sessionData.content;
        if (similarContent.length > 0) {
          const additionalContext = similarContent
            .map(chunk => chunk.content)
            .join('\n\n');
          context = `${context}\n\nAdditional relevant content:\n${additionalContext}`;
        }
        
        // Generate AI response
        const aiResponse = await llmService.generateResponse(
          userMessage,
          context,
          sessionData.section_title,
          conversationHistory
        );
        
        // Save AI response
        const client2 = await pool.connect();
        await client2.query(`
          INSERT INTO chat_messages (session_id, role, content)
          VALUES ($1, 'assistant', $2)
        `, [sessionId, aiResponse]);
        
        await client2.query(`
          UPDATE chat_sessions 
          SET last_activity = CURRENT_TIMESTAMP, message_count = message_count + 2
          WHERE id = $1
        `, [sessionId]);
        client2.release();
        
        // Synthesize and send audio response
        const audioBuffer = await voiceService.synthesizeSpeech(aiResponse);
        
        ws.send(JSON.stringify({
          type: 'response',
          userMessage: userMessage,
          aiResponse: aiResponse,
          audioResponse: audioBuffer.toString('base64')
        }));
        
      } catch (error) {
        console.error('Error handling voice message:', error);
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
      }
    }
    
    ws.on('close', () => {
      console.log('Voice WebSocket connection closed');
      if (voiceConnection) {
        voiceService.closeVoiceConnection(sessionId);
      }
    });
    
    ws.on('error', (error) => {
      console.error('Voice WebSocket error:', error);
      if (voiceConnection) {
        voiceService.closeVoiceConnection(sessionId);
      }
    });
  });
  
  return wss;
}

module.exports = { router, setupVoiceWebSocket };
