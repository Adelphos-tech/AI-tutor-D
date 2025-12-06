const { createClient } = require('@deepgram/sdk');
const WebSocket = require('ws');
const { EventEmitter } = require('events');

class VoiceService extends EventEmitter {
  constructor() {
    super();
    this.deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    this.activeConnections = new Map();
  }

  // Speech-to-Text using Deepgram
  async transcribeAudio(audioBuffer, options = {}) {
    try {
      console.log('Transcribing audio buffer of size:', audioBuffer.length);
      
      const { result, error } = await this.deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-2',
          language: 'en-US',
          smart_format: true,
          punctuate: true,
          diarize: false,
          ...options
        }
      );

      if (error) {
        console.error('Deepgram API error:', error);
        throw error;
      }

      console.log('Deepgram result:', JSON.stringify(result, null, 2));

      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      const confidence = result.results?.channels?.[0]?.alternatives?.[0]?.confidence;

      return {
        transcript: transcript || '',
        confidence: confidence || 0,
        words: result.results?.channels?.[0]?.alternatives?.[0]?.words || []
      };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      console.error('Error details:', error.message);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  // Text-to-Speech using Deepgram
  async synthesizeSpeech(text, options = {}) {
    try {
      console.log('🎵 Starting TTS synthesis...', { text: text.substring(0, 50), options });
      
      // Check if Deepgram API key is available
      if (!process.env.DEEPGRAM_API_KEY) {
        throw new Error('DEEPGRAM_API_KEY not configured');
      }
      
      // Default to English model if not specified
      const defaultModel = options.model || 'aura-asteria-en';
      
      console.log('🎵 Making Deepgram TTS request...', { model: defaultModel });
      
      const response = await this.deepgram.speak.request(
        { text },
        {
          model: defaultModel,
          encoding: 'linear16',
          sample_rate: 24000,
          ...options
        }
      );

      console.log('🎵 Deepgram TTS response received');

      const stream = await response.getStream();
      if (!stream) {
        throw new Error('No audio stream received from Deepgram');
      }

      console.log('🎵 Converting stream to buffer...');
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const audioBuffer = Buffer.concat(chunks);
      console.log('🎵 TTS synthesis successful, buffer size:', audioBuffer.length);
      
      return audioBuffer;
    } catch (error) {
      console.error('❌ TTS synthesis failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        hasApiKey: !!process.env.DEEPGRAM_API_KEY,
        textLength: text?.length
      });
      throw new Error(`TTS synthesis failed: ${error.message}`);
    }
  }

  // Real-time voice conversation setup
  setupVoiceConversation(sessionId, onTranscript, onError) {
    try {
      // Create WebSocket connection to Deepgram
      const connection = this.deepgram.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        endpointing: 300,
        vad_events: true
      });

      // Handle connection events
      connection.on('open', () => {
        console.log(`Voice connection opened for session: ${sessionId}`);
        this.emit('connectionOpen', sessionId);
      });

      connection.on('Results', (data) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        const isFinal = data.is_final;
        const confidence = data.channel?.alternatives?.[0]?.confidence;

        if (transcript && transcript.trim()) {
          onTranscript({
            transcript,
            isFinal,
            confidence,
            sessionId
          });
        }
      });

      connection.on('error', (error) => {
        console.error(`Voice connection error for session ${sessionId}:`, error);
        onError(error);
      });

      connection.on('close', () => {
        console.log(`Voice connection closed for session: ${sessionId}`);
        this.activeConnections.delete(sessionId);
        this.emit('connectionClosed', sessionId);
      });

      // Store connection
      this.activeConnections.set(sessionId, connection);

      return connection;
    } catch (error) {
      console.error('Error setting up voice conversation:', error);
      throw error;
    }
  }

  // Send audio data to Deepgram
  sendAudioData(sessionId, audioData) {
    const connection = this.activeConnections.get(sessionId);
    if (connection && connection.getReadyState() === 1) {
      connection.send(audioData);
    } else {
      console.warn(`No active connection for session: ${sessionId}`);
    }
  }

  // Close voice connection
  closeVoiceConnection(sessionId) {
    const connection = this.activeConnections.get(sessionId);
    if (connection) {
      connection.finish();
      this.activeConnections.delete(sessionId);
    }
  }

  // Get connection status
  getConnectionStatus(sessionId) {
    const connection = this.activeConnections.get(sessionId);
    if (!connection) {
      return 'disconnected';
    }

    const readyState = connection.getReadyState();
    switch (readyState) {
      case 0: return 'connecting';
      case 1: return 'connected';
      case 2: return 'closing';
      case 3: return 'closed';
      default: return 'unknown';
    }
  }

  // Voice activity detection
  detectVoiceActivity(audioBuffer, threshold = 0.01) {
    // Simple voice activity detection based on audio energy
    const samples = new Float32Array(audioBuffer);
    let energy = 0;
    
    for (let i = 0; i < samples.length; i++) {
      energy += samples[i] * samples[i];
    }
    
    const rms = Math.sqrt(energy / samples.length);
    return rms > threshold;
  }

  // Cleanup all connections
  cleanup() {
    for (const [sessionId, connection] of this.activeConnections) {
      try {
        connection.finish();
      } catch (error) {
        console.error(`Error closing connection for session ${sessionId}:`, error);
      }
    }
    this.activeConnections.clear();
  }
}

module.exports = new VoiceService();
