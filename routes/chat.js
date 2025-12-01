const express = require('express');
const { pool } = require('../config/database');
const documentProcessor = require('../services/documentProcessor');
const llmService = require('../services/llmService');

const router = express.Router();

// Create new chat session
router.post('/sessions', async (req, res) => {
  try {
    const { documentId, sectionId, sessionName } = req.body;
    
    if (!documentId || !sectionId) {
      return res.status(400).json({ error: 'Document ID and Section ID are required' });
    }
    
    const client = await pool.connect();
    
    // Verify document and section exist
    const sectionResult = await client.query(`
      SELECT ds.*, d.original_name
      FROM document_sections ds
      JOIN documents d ON ds.document_id = d.id
      WHERE ds.document_id = $1 AND ds.id = $2
    `, [documentId, sectionId]);
    
    if (sectionResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Document section not found' });
    }
    
    // Create chat session
    const sessionResult = await client.query(`
      INSERT INTO chat_sessions (document_id, section_id, session_name)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [documentId, sectionId, sessionName || `Session for ${sectionResult.rows[0].section_title}`]);
    
    client.release();
    
    res.json({
      success: true,
      session: {
        ...sessionResult.rows[0],
        sectionTitle: sectionResult.rows[0].section_title,
        documentName: sectionResult.rows[0].original_name
      }
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ 
      error: 'Failed to create chat session',
      message: error.message 
    });
  }
});

// Get chat sessions for a document
router.get('/sessions/document/:documentId', async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT cs.*, ds.section_title, d.original_name
      FROM chat_sessions cs
      JOIN document_sections ds ON cs.section_id = ds.id
      JOIN documents d ON cs.document_id = d.id
      WHERE cs.document_id = $1
      ORDER BY cs.last_activity DESC
    `, [documentId]);
    
    client.release();
    
    res.json({
      success: true,
      sessions: result.rows
    });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chat sessions',
      message: error.message 
    });
  }
});

// Get chat session with messages
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const client = await pool.connect();
    
    // Get session info
    const sessionResult = await client.query(`
      SELECT cs.*, ds.section_title, d.original_name
      FROM chat_sessions cs
      JOIN document_sections ds ON cs.section_id = ds.id
      JOIN documents d ON cs.document_id = d.id
      WHERE cs.id = $1
    `, [sessionId]);
    
    if (sessionResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Chat session not found' });
    }
    
    // Get messages
    const messagesResult = await client.query(`
      SELECT * FROM chat_messages
      WHERE session_id = $1
      ORDER BY timestamp ASC
    `, [sessionId]);
    
    client.release();
    
    res.json({
      success: true,
      session: sessionResult.rows[0],
      messages: messagesResult.rows
    });
  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chat session',
      message: error.message 
    });
  }
});

// Send message in chat session
router.post('/sessions/:sessionId/messages', async (req, res) => {
  console.log(`📨 Received message for session ${req.params.sessionId}:`, req.body);
  
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      console.log('❌ Empty message received');
      return res.status(400).json({ error: 'Message is required' });
    }

    // Try full functionality with comprehensive error handling
    console.log('🚀 Attempting full AI tutor functionality...');
    
    // Try to use LLM service for intelligent responses
    console.log('🤖 Attempting AI response generation...');
    
    // Set up basic context for AI response
    let aiContext = "You are Dr. Sarah Chen, a PhD-level academic tutor. Provide helpful, educational responses to student questions.";
    let sessionTitle = "General Academic Discussion";
    let chatHistory = [];
    
    // Try to get database context if available
    console.log('🔗 Attempting database connection...');
    let client = null;
    let hasDatabase = false;
    
    try {
      client = await pool.connect();
      console.log('✅ Database connected successfully');
      hasDatabase = true;
    } catch (dbError) {
      console.error('❌ Database connection failed, continuing with basic context:', dbError);
      hasDatabase = false;
    }
    
    // Get enhanced context from database if available
    if (hasDatabase && client) {
      console.log('🔍 Querying session data...');
      try {
        const sessionResult = await client.query(`
          SELECT cs.*, 
                 COALESCE(ds.section_title, 'General Discussion') as section_title, 
                 COALESCE(ds.content, 'No specific document context available. I can help with general academic questions.') as content,
                 cs.document_id
          FROM chat_sessions cs
          LEFT JOIN document_sections ds ON cs.section_id = ds.id
          WHERE cs.id = $1
        `, [sessionId]);
        
        if (sessionResult.rows.length > 0) {
          const session = sessionResult.rows[0];
          sessionTitle = session.section_title;
          aiContext = session.content;
          console.log('✅ Enhanced context loaded from database');
        } else {
          console.log('⚠️ Session not found, using basic context');
        }
      } catch (queryError) {
        console.error('❌ Session query failed, using basic context:', queryError);
      }
    } else {
      console.log('📝 Using basic academic tutor context (no database)');
    }
    // Now proceed with AI response generation using available context
    console.log('🎯 Context prepared:', { sessionTitle, hasDatabase });
    // Skip RAG search for now, use the context we have
    console.log('📚 Using prepared context for AI response');
    
    // Generate AI response with timeout
    console.log('🤖 Generating AI response...');
    let aiResponse;
    try {
      // Add timeout to prevent hanging
      const responsePromise = llmService.generateResponse(
        message,
        aiContext,
        sessionTitle,
        chatHistory
      );
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('LLM response timeout')), 10000)
      );
      
      aiResponse = await Promise.race([responsePromise, timeoutPromise]);
      console.log('✅ AI response generated successfully');
    } catch (llmError) {
      console.error('❌ LLM service failed:', llmError);
      // Provide a helpful fallback response
      aiResponse = `Hello! I heard you say: "${message}". I'm Dr. Sarah Chen, your AI academic tutor. I'm having some technical difficulties with my advanced AI processing right now, but I'm still here to help you learn! What specific topic would you like to explore?`;
      console.log('🔄 Using intelligent fallback response');
    }
    
    // Save AI response (optional - don't fail if this doesn't work)
    try {
      const client2 = await pool.connect();
      await client2.query(`
        INSERT INTO chat_messages (session_id, role, content)
        VALUES ($1, 'assistant', $2)
      `, [sessionId, aiResponse]);
      
      // Update session activity
      await client2.query(`
        UPDATE chat_sessions 
        SET last_activity = CURRENT_TIMESTAMP, message_count = message_count + 2
        WHERE id = $1
      `, [sessionId]);
      
      client2.release();
      console.log('✅ Message saved to database');
    } catch (saveError) {
      console.error('⚠️ Failed to save message to database:', saveError);
      // Don't fail the request if we can't save to database
      console.log('🔄 Continuing without saving to database');
    }
    
    res.json({
      success: true,
      userMessage: message,
      aiResponse: aiResponse,
      relevantChunks: 0,
      mode: hasDatabase ? 'enhanced' : 'basic'
    });
  } catch (error) {
    console.error('❌ Error in full functionality, using fallback response:', error);
    
    // Fallback to simple response if full functionality fails
    const fallbackResponse = `Hello! I heard you say: "${message}". I'm Dr. Sarah Chen, your AI academic tutor. I'm experiencing some technical difficulties with my advanced features, but I'm still here to help you with your studies! Could you try asking your question again?`;
    
    console.log('🔄 Using fallback response due to error');
    res.json({
      success: true,
      userMessage: message,
      aiResponse: fallbackResponse,
      relevantChunks: 0,
      fallbackMode: true,
      error: error.message
    });
  }
});

// Stream chat response
router.post('/sessions/:sessionId/stream', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
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
      res.write(`data: ${JSON.stringify({ error: 'Chat session not found' })}\n\n`);
      res.end();
      return;
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
    
    // Save user message
    await client.query(`
      INSERT INTO chat_messages (session_id, role, content)
      VALUES ($1, 'user', $2)
    `, [sessionId, message]);
    
    client.release();
    
    // Get relevant context
    const similarContent = await documentProcessor.searchSimilarContent(
      message, 
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
    
    // Generate streaming response
    const stream = await llmService.generateStreamResponse(
      message,
      context,
      session.section_title,
      conversationHistory
    );
    
    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
      }
    }
    
    // Save complete AI response
    const client2 = await pool.connect();
    await client2.query(`
      INSERT INTO chat_messages (session_id, role, content)
      VALUES ($1, 'assistant', $2)
    `, [sessionId, fullResponse]);
    
    await client2.query(`
      UPDATE chat_sessions 
      SET last_activity = CURRENT_TIMESTAMP, message_count = message_count + 2
      WHERE id = $1
    `, [sessionId]);
    
    client2.release();
    
    res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
    res.end();
    
  } catch (error) {
    console.error('Error streaming chat response:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to process message' })}\n\n`);
    res.end();
  }
});

// Delete chat session
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const client = await pool.connect();
    
    const result = await client.query(`
      DELETE FROM chat_sessions WHERE id = $1 RETURNING id
    `, [sessionId]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Chat session not found' });
    }
    
    res.json({
      success: true,
      message: 'Chat session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({ 
      error: 'Failed to delete chat session',
      message: error.message 
    });
  }
});

// Generate section summary
router.get('/sections/:sectionId/summary', async (req, res) => {
  try {
    const sectionId = parseInt(req.params.sectionId);
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT section_title, content FROM document_sections WHERE id = $1
    `, [sectionId]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    const section = result.rows[0];
    const summary = await llmService.generateSectionSummary(section.content, section.section_title);
    
    res.json({
      success: true,
      summary: summary
    });
  } catch (error) {
    console.error('Error generating section summary:', error);
    res.status(500).json({ 
      error: 'Failed to generate section summary',
      message: error.message 
    });
  }
});

// Generate study questions
router.get('/sections/:sectionId/questions', async (req, res) => {
  try {
    const sectionId = parseInt(req.params.sectionId);
    const count = parseInt(req.query.count) || 5;
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT section_title, content FROM document_sections WHERE id = $1
    `, [sectionId]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    const section = result.rows[0];
    const questions = await llmService.generateStudyQuestions(section.content, section.section_title, count);
    
    res.json({
      success: true,
      questions: questions
    });
  } catch (error) {
    console.error('Error generating study questions:', error);
    res.status(500).json({ 
      error: 'Failed to generate study questions',
      message: error.message 
    });
  }
});

module.exports = router;
