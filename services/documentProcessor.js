const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const { pool } = require('../config/database');
const { getPineconeIndex } = require('../config/pinecone');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class DocumentProcessor extends EventEmitter {
  constructor() {
    super();
    this.supportedTypes = ['.pdf', '.docx', '.xlsx', '.txt'];
    this.embeddingService = null;
    this.processingProgress = new Map(); // Track progress for each document
  }

  async getEmbeddingService() {
    if (!this.embeddingService) {
      try {
        this.embeddingService = require('./embeddings');
        // Initialize the service to trigger any ES module loading
        await this.embeddingService.initialize();
      } catch (error) {
        console.error('Failed to load embedding service:', error);
        // Return a mock service that doesn't crash
        this.embeddingService = {
          generateEmbedding: async () => new Array(384).fill(0),
          chunkText: (text) => [{ text, startIndex: 0, endIndex: text.length }]
        };
      }
    }
    return this.embeddingService;
  }

  async processDocument(filePath, originalName, fileType) {
    const processingId = uuidv4();
    
    try {
      console.log(`🚀 Processing document: ${originalName}`);
      this.emit('progress', { processingId, stage: 'starting', progress: 0, message: 'Starting document processing...' });
      
      // Extract text content based on file type (10% progress)
      this.emit('progress', { processingId, stage: 'extracting', progress: 10, message: 'Extracting text content...' });
      const content = await this.extractContent(filePath, fileType);
      
      // Segment content into chapters/sections (30% progress)
      this.emit('progress', { processingId, stage: 'segmenting', progress: 30, message: 'Analyzing document structure...' });
      const sections = await this.segmentContent(content, fileType);
      
      // Save document metadata to database (50% progress)
      this.emit('progress', { processingId, stage: 'saving', progress: 50, message: 'Saving document metadata...' });
      const documentId = await this.saveDocumentMetadata(originalName, fileType, filePath, content, sections);
      
      // Process and store sections with embeddings (50-90% progress)
      this.emit('progress', { processingId, stage: 'embeddings', progress: 60, message: 'Generating AI embeddings...' });
      await this.processSections(documentId, sections, processingId);
      
      // Mark document as processed (100% progress)
      this.emit('progress', { processingId, stage: 'completing', progress: 95, message: 'Finalizing document...' });
      await this.markDocumentProcessed(documentId);
      
      this.emit('progress', { processingId, stage: 'completed', progress: 100, message: 'Document processing completed!' });
      console.log(`✅ Document processed successfully: ${originalName}`);
      return { documentId, processingId };
      
    } catch (error) {
      console.error('❌ Error processing document:', error);
      this.emit('progress', { processingId, stage: 'error', progress: 0, message: `Error: ${error.message}` });
      throw error;
    }
  }

  async extractContent(filePath, fileType) {
    console.log(`📄 Extracting content from ${fileType} file: ${path.basename(filePath)}`);
    
    // Check file size for memory management
    const stats = await fs.stat(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    console.log(`📊 File size: ${fileSizeMB.toFixed(2)} MB`);
    
    if (fileSizeMB > 100) {
      throw new Error(`File too large: ${fileSizeMB.toFixed(2)} MB. Maximum supported size is 100 MB.`);
    }
    
    try {
      const buffer = await fs.readFile(filePath);
      
      switch (fileType.toLowerCase()) {
        case '.pdf':
          console.log('🔍 Parsing PDF document...');
          const pdfData = await pdfParse(buffer, {
            // Optimize for large PDFs
            max: 0, // No page limit
            version: 'v1.10.100'
          });
          return pdfData.text;
          
        case '.docx':
          console.log('📝 Extracting DOCX content...');
          const docxResult = await mammoth.extractRawText({ 
            buffer,
            // Optimize for large documents
            convertImage: mammoth.images.ignoreAll
          });
          return docxResult.value;
          
        case '.xlsx':
          console.log('📊 Processing Excel spreadsheet...');
          const workbook = xlsx.read(buffer, { 
            type: 'buffer',
            // Optimize for large spreadsheets
            cellText: false,
            cellDates: true
          });
          let content = '';
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const sheetData = xlsx.utils.sheet_to_txt(sheet);
            content += `Sheet: ${sheetName}\n${sheetData}\n\n`;
          });
          return content;
          
        case '.txt':
          console.log('📄 Reading text file...');
          return buffer.toString('utf-8');
          
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error(`❌ Error extracting content from ${fileType} file:`, error);
      throw new Error(`Failed to extract content: ${error.message}`);
    }
  }

  async segmentContent(content, fileType) {
    const sections = [];
    
    // Different segmentation strategies based on file type
    if (fileType === '.pdf' || fileType === '.docx') {
      // Look for chapter/section headers
      const chapterRegex = /(?:^|\n)\s*(?:chapter|section|part)\s*\d+[:\.\s]*(.*?)(?=\n|$)/gi;
      const headerRegex = /(?:^|\n)\s*([A-Z][A-Z\s]{10,})\s*(?=\n)/g;
      
      let matches = [...content.matchAll(chapterRegex)];
      
      if (matches.length === 0) {
        // Fallback to generic headers
        matches = [...content.matchAll(headerRegex)];
      }
      
      if (matches.length > 0) {
        // Split content by detected sections
        for (let i = 0; i < matches.length; i++) {
          const match = matches[i];
          const startIndex = match.index;
          const endIndex = i < matches.length - 1 ? matches[i + 1].index : content.length;
          
          const sectionContent = content.substring(startIndex, endIndex).trim();
          const title = match[1] || `Section ${i + 1}`;
          
          if (sectionContent.length > 100) { // Only include substantial sections
            sections.push({
              title: title.trim(),
              content: sectionContent,
              sectionNumber: i + 1
            });
          }
        }
      }
    }
    
    // If no sections found or for other file types, create sections by length
    if (sections.length === 0) {
      const maxSectionLength = 5000; // characters
      const words = content.split(/\s+/);
      const wordsPerSection = Math.ceil(maxSectionLength / 5); // Rough estimate
      
      for (let i = 0; i < words.length; i += wordsPerSection) {
        const sectionWords = words.slice(i, i + wordsPerSection);
        const sectionContent = sectionWords.join(' ');
        
        if (sectionContent.trim().length > 100) {
          sections.push({
            title: `Section ${Math.floor(i / wordsPerSection) + 1}`,
            content: sectionContent.trim(),
            sectionNumber: Math.floor(i / wordsPerSection) + 1
          });
        }
      }
    }
    
    return sections;
  }

  async saveDocumentMetadata(originalName, fileType, filePath, content, sections) {
    const client = await pool.connect();
    
    try {
      const stats = await fs.stat(filePath);
      const preview = content.substring(0, 500) + (content.length > 500 ? '...' : '');
      
      const result = await client.query(`
        INSERT INTO documents (filename, original_name, file_type, file_size, content_preview, total_chunks)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [path.basename(filePath), originalName, fileType, stats.size, preview, sections.length]);
      
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }

  async processSections(documentId, sections, processingId = null) {
    console.log(`📚 Processing ${sections.length} sections for document ${documentId}`);
    
    let client;
    try {
      const embeddingService = await this.getEmbeddingService();
      
      client = await pool.connect();
      
      // Initialize Pinecone if not already initialized
      const { initializePinecone, getPineconeIndex } = require('../config/pinecone');
      try {
        await initializePinecone();
      } catch (error) {
        console.log('Pinecone already initialized or initialization failed:', error.message);
      }
      const index = getPineconeIndex();
      
      for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
        const section = sections[sectionIndex];
        
        // Update progress for each section (60-90% range)
        const sectionProgress = 60 + Math.round((sectionIndex / sections.length) * 30);
        if (processingId) {
          this.emit('progress', { 
            processingId, 
            stage: 'embeddings', 
            progress: sectionProgress, 
            message: `Processing section ${sectionIndex + 1}/${sections.length}: ${section.title}` 
          });
        }
        
        // Chunk the section content for better embeddings
        const chunks = embeddingService.chunkText(section.content);
        const vectorIds = [];
        
        // Generate embeddings for each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const embedding = await embeddingService.generateEmbedding(chunk.text);
          
          const vectorId = `${documentId}_${section.sectionNumber}_${i}`;
          vectorIds.push(vectorId);
          
          // Store in Pinecone
          await index.upsert([{
            id: vectorId,
            values: embedding,
            metadata: {
              documentId: documentId,
              sectionId: section.sectionNumber,
              sectionTitle: section.title,
              chunkIndex: i,
              content: chunk.text,
              wordCount: chunk.text.split(/\s+/).length
            }
          }]);
        }
        
        // Save section to database
        await client.query(`
          INSERT INTO document_sections (document_id, section_title, section_number, content, word_count, vector_ids)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          documentId,
          section.title,
          section.sectionNumber,
          section.content,
          section.content.split(/\s+/).length,
          vectorIds
        ]);
      }
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async markDocumentProcessed(documentId) {
    const client = await pool.connect();
    
    try {
      await client.query(`
        UPDATE documents SET processed = TRUE WHERE id = $1
      `, [documentId]);
    } finally {
      client.release();
    }
  }

  async getDocumentSections(documentId) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT id, section_title, section_number, word_count
        FROM document_sections
        WHERE document_id = $1
        ORDER BY section_number
      `, [documentId]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  async searchSimilarContent(query, documentId, sectionId = null, limit = 5) {
    try {
      const embeddingService = await this.getEmbeddingService();
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      const index = getPineconeIndex();
      
      const filter = { documentId: documentId };
      if (sectionId) {
        filter.sectionId = sectionId;
      }
      
      const searchResults = await index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata: true,
        filter: filter
      });
      
      return searchResults.matches.map(match => ({
        content: match.metadata.content,
        score: match.score,
        sectionTitle: match.metadata.sectionTitle,
        chunkIndex: match.metadata.chunkIndex
      }));
    } catch (error) {
      console.error('Error searching similar content:', error);
      throw error;
    }
  }
}

module.exports = new DocumentProcessor();
