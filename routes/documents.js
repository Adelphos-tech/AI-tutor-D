const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { pool } = require('../config/database');
const documentProcessor = require('../services/documentProcessor');

const router = express.Router();

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
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, filename, path: filePath } = req.file;
    const fileType = path.extname(originalname).toLowerCase();

    // Process document asynchronously
    const documentId = await documentProcessor.processDocument(filePath, originalname, fileType);

    res.json({
      success: true,
      documentId,
      message: 'Document uploaded and processing started',
      filename: originalname
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload document',
      message: error.message 
    });
  }
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
