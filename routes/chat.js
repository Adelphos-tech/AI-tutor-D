const express = require('express');
const { pool } = require('../config/database');
const llmService = require('../services/llmService');
const documentProcessor = require('../services/documentProcessor');

const router = express.Router();

// Helper function for regular message processing
async function handleRegularMessage(sessionId, message, language = 'en') {
  let client = null;
  
  try {
    client = await pool.connect();
    
    // Get session and section info
    const sessionResult = await client.query(`
      SELECT cs.*, ds.section_title, ds.content, ds.document_id
      FROM chat_sessions cs
      JOIN document_sections ds ON cs.section_id = ds.id
      WHERE cs.id = $1
    `, [sessionId]);
    
    if (sessionResult.rows.length === 0) {
      throw new Error('Chat session not found');
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
    
    // Get additional context using RAG
    let additionalContext = '';
    try {
      const searchResults = await documentProcessor.searchSimilarContent(
        message, 
        session.document_id, 
        session.section_id, 
        3
      );
      
      if (searchResults && searchResults.length > 0) {
        additionalContext = searchResults.map(result => result.content).join('\n\n');
      }
    } catch (ragError) {
      console.log('⚠️ RAG search failed, continuing without additional context:', ragError.message);
    }
    
    // Generate AI response
    let context = `Section: ${session.section_title}\n\nContent: ${session.content}`;
    if (additionalContext) {
      context = `${context}\n\nAdditional relevant content:\n${additionalContext}`;
    }
    
    const aiResponse = await llmService.generateResponse(
      message,
      context,
      session.section_title,
      conversationHistory,
      language
    );
    
    // Save messages to database
    await client.query(`
      INSERT INTO chat_messages (session_id, role, content)
      VALUES ($1, 'user', $2), ($1, 'assistant', $3)
    `, [sessionId, message, aiResponse]);
    
    await client.query(`
      UPDATE chat_sessions 
      SET last_activity = CURRENT_TIMESTAMP, message_count = message_count + 2
      WHERE id = $1
    `, [sessionId]);
    
    return {
      success: true,
      userMessage: message,
      aiResponse: aiResponse,
      relevantChunks: additionalContext ? 1 : 0,
      mode: 'enhanced'
    };
    
  } catch (error) {
    console.error('Error in handleRegularMessage:', error);
    
    // Fallback response
    const fallbackResponse = `Hello! I heard you say: "${message}". I'm Dr. Sarah Chen, your AI academic tutor. I'm experiencing some technical difficulties with my advanced features, but I'm still here to help you with your studies! Could you try asking your question again?`;
    
    return {
      success: true,
      userMessage: message,
      aiResponse: fallbackResponse,
      relevantChunks: 0,
      mode: 'fallback'
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Create new chat session
router.post('/sessions', async (req, res) => {
  try {
    const { documentId, sectionId, sessionName } = req.body;
    
    if (!documentId || !sectionId) {
      return res.status(400).json({ error: 'Document ID and Section ID are required' });
    }
    
    const client = await pool.connect();
    
    try {
      // Verify document section exists
      const sectionResult = await client.query(`
        SELECT ds.*, d.original_name
        FROM document_sections ds
        JOIN documents d ON ds.document_id = d.id
        WHERE ds.id = $1 AND ds.document_id = $2
      `, [sectionId, documentId]);
      
      if (sectionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Document section not found' });
      }
      
      // Create chat session
      const sessionResult = await client.query(`
        INSERT INTO chat_sessions (document_id, section_id, session_name)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [documentId, sectionId, sessionName || `Session for ${sectionResult.rows[0].section_title}`]);
      
      res.json({
        success: true,
        session: {
          ...sessionResult.rows[0],
          sectionTitle: sectionResult.rows[0].section_title,
          documentName: sectionResult.rows[0].original_name
        }
      });
    } finally {
      client.release();
    }
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

// Get specific chat session with messages
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const client = await pool.connect();
    
    try {
      const sessionResult = await client.query(`
        SELECT cs.*, ds.section_title, d.original_name
        FROM chat_sessions cs
        JOIN document_sections ds ON cs.section_id = ds.id
        JOIN documents d ON cs.document_id = d.id
        WHERE cs.id = $1
      `, [sessionId]);
      
      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ error: 'Chat session not found' });
      }
      
      const messagesResult = await client.query(`
        SELECT * FROM chat_messages
        WHERE session_id = $1
        ORDER BY timestamp ASC
      `, [sessionId]);
      
      res.json({
        success: true,
        session: sessionResult.rows[0],
        messages: messagesResult.rows
      });
    } finally {
      client.release();
    }
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
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { message, language } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Use the helper function
    const result = await handleRegularMessage(sessionId, message, language);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in message endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      message: error.message
    });
  }
});

// Stream chat response
router.post('/sessions/:sessionId/stream', async (req, res) => {
  // Production fallback: Use regular chat if streaming fails
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 Production mode: Using regular chat instead of streaming');
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { message, language } = req.body;
      
      // Call regular message endpoint internally
      const regularResponse = await handleRegularMessage(sessionId, message, language);
      
      // Convert to streaming format
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      // Send response as chunks
      const response = regularResponse.aiResponse;
      const words = response.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? ' ' : '');
        res.write(`data: ${JSON.stringify({ content: word, done: false })}\n\n`);
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
      res.end();
      return;
    } catch (error) {
      console.error('Production fallback failed:', error);
      res.write(`data: ${JSON.stringify({ error: 'Chat service temporarily unavailable' })}\n\n`);
      res.end();
      return;
    }
  }
  
  // Development mode: Use actual streaming
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { message, language } = req.body;
    
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
    
    try {
      // Get session and section info
      const sessionResult = await client.query(`
        SELECT cs.*, ds.section_title, ds.content, ds.document_id
        FROM chat_sessions cs
        JOIN document_sections ds ON cs.section_id = ds.id
        WHERE cs.id = $1
      `, [sessionId]);
      
      if (sessionResult.rows.length === 0) {
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
      
      // Get additional context using RAG
      let additionalContext = '';
      try {
        const searchResults = await documentProcessor.searchSimilarContent(
          message, 
          session.document_id, 
          session.section_id, 
          3
        );
        
        if (searchResults && searchResults.length > 0) {
          additionalContext = searchResults.map(result => result.content).join('\n\n');
        }
      } catch (ragError) {
        console.log('⚠️ RAG search failed:', ragError.message);
      }
      
      // Generate context
      let context = `Section: ${session.section_title}\n\nContent: ${session.content}`;
      if (additionalContext) {
        context = `${context}\n\nAdditional relevant content:\n${additionalContext}`;
      }
      
      // Generate streaming response
      const stream = await llmService.generateStreamResponse(
        message,
        context,
        session.section_title,
        conversationHistory,
        language
      );
      
      let fullResponse = '';
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
        }
      }
      
      // Save messages to database
      const client2 = await pool.connect();
      await client2.query(`
        INSERT INTO chat_messages (session_id, role, content)
        VALUES ($1, 'user', $2), ($1, 'assistant', $3)
      `, [sessionId, message, fullResponse]);
      
      await client2.query(`
        UPDATE chat_sessions 
        SET last_activity = CURRENT_TIMESTAMP, message_count = message_count + 2
        WHERE id = $1
      `, [sessionId]);
      
      client2.release();
      
      res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
      res.end();
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error streaming chat response:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      sessionId: req.params.sessionId,
      userMessage: req.body.message
    });
    
    // Send detailed error information
    res.write(`data: ${JSON.stringify({ 
      error: 'Failed to process message',
      details: error.message,
      sessionId: req.params.sessionId
    })}\n\n`);
    res.end();
  }
});

// Delete chat session
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const client = await pool.connect();
    
    try {
      await client.query('DELETE FROM chat_sessions WHERE id = $1', [sessionId]);
      res.json({ success: true, message: 'Chat session deleted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({ 
      error: 'Failed to delete chat session',
      message: error.message 
    });
  }
});

module.exports = router;
