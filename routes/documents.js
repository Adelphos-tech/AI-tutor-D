const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { pool } = require('../config/database');
const documentProcessor = require('../services/documentProcessor');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.ensureDirSync(uploadsDir);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    uploadsDir: uploadsDir,
    uploadsDirExists: fs.existsSync(uploadsDir),
    timestamp: new Date().toISOString()
  });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.xlsx', '.txt'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${fileExt}. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

// Upload and process document
router.post('/upload', (req, res) => {
  // Handle multer errors first
  upload.single('document')(req, res, async (err) => {
    if (err) {
      console.error('❌ Multer upload error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'File too large',
          message: 'File size exceeds 50MB limit'
        });
      }
      
      if (err.message.includes('Unsupported file type')) {
        return res.status(400).json({ 
          error: 'Unsupported file type',
          message: err.message
        });
      }
      
      return res.status(500).json({ 
        error: 'Upload failed',
        message: err.message || 'Unknown upload error'
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ 
          error: 'No file uploaded',
          message: 'Please select a file to upload'
        });
      }

      const { originalname, filename, path: filePath } = req.file;
      const fileType = path.extname(originalname).toLowerCase();
      
      console.log('📁 File uploaded successfully:', {
        originalname,
        filename,
        filePath,
        fileType,
        size: req.file.size
      });

    // Start document processing asynchronously with progress tracking
    console.log('🚀 Starting async document processing for:', originalname);
    
    // Generate processing ID for tracking
    const processingId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Process document in background without blocking the response
    documentProcessor.processDocument(filePath, originalname, fileType)
      .then(result => {
        console.log('✅ Document processing completed:', result);
      })
      .catch(async error => {
        console.error('❌ Document processing failed:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          filePath,
          originalname,
          fileType
        });
        
        // Mark document as processed even if processing failed
        // This prevents it from being stuck in "processing" state forever
        try {
          const client = await pool.connect();
          try {
            // Find the document by filename and mark as processed
            const docResult = await client.query(`
              UPDATE documents 
              SET processed = TRUE 
              WHERE filename = $1 AND processed = FALSE
              RETURNING id, original_name
            `, [path.basename(filePath)]);
            
            if (docResult.rows.length > 0) {
              const doc = docResult.rows[0];
              console.log('📝 Marked failed document as processed to prevent stuck state');
              
              // Create basic sections so the document is still usable
              console.log('🔧 Creating fallback sections for failed document...');
              
              const isThesis = doc.original_name.toLowerCase().includes('thesis');
              const isPDF = doc.original_name.toLowerCase().includes('.pdf');
              
              let sections;
              if (isThesis) {
                sections = [
                  {
                    title: 'Thesis Document',
                    content: `This thesis document (${doc.original_name}) was uploaded but could not be fully processed due to file format issues. However, you can still discuss general thesis topics, research methodologies, and academic concepts with the AI tutor.`,
                    number: 1
                  },
                  {
                    title: 'Research Discussion',
                    content: 'While the specific content could not be extracted, you can ask questions about research methods, data analysis, literature reviews, and thesis writing techniques. The AI can provide general academic guidance.',
                    number: 2
                  }
                ];
              } else {
                sections = [
                  {
                    title: 'Document Content',
                    content: `This document (${doc.original_name}) was uploaded but could not be processed due to file format issues. You can still use this space to discuss topics related to the document or ask general questions.`,
                    number: 1
                  },
                  {
                    title: 'General Discussion',
                    content: 'Use this section to have conversations about topics that might be related to your document, or ask the AI tutor for help with understanding concepts.',
                    number: 2
                  }
                ];
              }
              
              // Insert fallback sections
              for (const section of sections) {
                await client.query(`
                  INSERT INTO document_sections (document_id, section_title, section_number, content, word_count, vector_ids)
                  VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                  doc.id,
                  section.title,
                  section.number,
                  section.content,
                  section.content.split(/\s+/).length,
                  []
                ]);
              }
              
              console.log(`✅ Created ${sections.length} fallback sections for document ${doc.id}`);
            }
          } finally {
            client.release();
          }
        } catch (dbError) {
          console.error('❌ Failed to mark document as processed:', dbError);
        }
      });
    
    res.json({
      success: true,
      processingId: processingId,
      message: 'Document uploaded successfully. Processing started...',
      filename: originalname,
      processing: true,
      stages: [
        'extracting',
        'segmenting', 
        'saving',
        'embeddings',
        'completing'
      ]
    });
    } catch (error) {
      console.error('❌ Processing error:', error);
      res.status(500).json({ 
        error: 'Failed to process document',
        message: error.message 
      });
    }
  });
});

// Get processing progress
router.get('/progress/:processingId', (req, res) => {
  const { processingId } = req.params;
  
  // Set up Server-Sent Events for real-time progress
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Listen for progress events from document processor
  const progressHandler = (progressData) => {
    if (progressData.processingId === processingId) {
      res.write(`data: ${JSON.stringify(progressData)}\n\n`);
      
      // Close connection when processing is complete or failed
      if (progressData.stage === 'completed' || progressData.stage === 'error') {
        res.end();
      }
    }
  };

  documentProcessor.on('progress', progressHandler);

  // Clean up on client disconnect
  req.on('close', () => {
    documentProcessor.removeListener('progress', progressHandler);
    res.end();
  });

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({
    processingId,
    stage: 'connected',
    progress: 0,
    message: 'Connected to progress stream'
  })}\n\n`);
});

// Get all documents
router.get('/', async (req, res) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT id, original_name, file_type, file_size, upload_date, processed, total_chunks, content_preview
      FROM documents
      ORDER BY upload_date DESC
    `);
    
    client.release();
    
    res.json({
      success: true,
      documents: result.rows
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ 
      error: 'Failed to fetch documents',
      message: error.message 
    });
  }
});

// Get document details with sections
router.get('/:id', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const client = await pool.connect();
    
    // Get document info
    const docResult = await client.query(`
      SELECT * FROM documents WHERE id = $1
    `, [documentId]);
    
    if (docResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Get document sections
    const sectionsResult = await client.query(`
      SELECT id, section_title, section_number, word_count
      FROM document_sections
      WHERE document_id = $1
      ORDER BY section_number
    `, [documentId]);
    
    client.release();
    
    res.json({
      success: true,
      document: docResult.rows[0],
      sections: sectionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching document details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch document details',
      message: error.message 
    });
  }
});

// Get section content
router.get('/:id/sections/:sectionId', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const sectionId = parseInt(req.params.sectionId);
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT ds.*, d.original_name
      FROM document_sections ds
      JOIN documents d ON ds.document_id = d.id
      WHERE ds.document_id = $1 AND ds.id = $2
    `, [documentId, sectionId]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    res.json({
      success: true,
      section: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching section content:', error);
    res.status(500).json({ 
      error: 'Failed to fetch section content',
      message: error.message 
    });
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const client = await pool.connect();
    
    // Get document info first
    const docResult = await client.query(`
      SELECT filename FROM documents WHERE id = $1
    `, [documentId]);
    
    if (docResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Delete from database (cascades to sections and sessions)
    await client.query(`DELETE FROM documents WHERE id = $1`, [documentId]);
    
    // Delete physical file
    const filePath = path.join(process.env.UPLOAD_DIR || './uploads', docResult.rows[0].filename);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
    
    client.release();
    
    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ 
      error: 'Failed to delete document',
      message: error.message 
    });
  }
});

// Get processing status
router.get('/:id/status', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT processed, total_chunks FROM documents WHERE id = $1
    `, [documentId]);
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({
      success: true,
      processed: result.rows[0].processed,
      totalChunks: result.rows[0].total_chunks
    });
  } catch (error) {
    console.error('Error checking processing status:', error);
    res.status(500).json({ 
      error: 'Failed to check processing status',
      message: error.message 
    });
  }
});

module.exports = router;
