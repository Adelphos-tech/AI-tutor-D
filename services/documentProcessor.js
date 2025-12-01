const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const { pool } = require('../config/database');
const { getPineconeIndex } = require('../config/pinecone');
const embeddingService = require('./embeddings');
const { v4: uuidv4 } = require('uuid');

class DocumentProcessor {
  constructor() {
    this.supportedTypes = ['.pdf', '.docx', '.xlsx', '.txt'];
  }

  async processDocument(filePath, originalName, fileType) {
    try {
      console.log(`Processing document: ${originalName}`);
      
      // Extract text content based on file type
      const content = await this.extractContent(filePath, fileType);
      
      // Segment content into chapters/sections
      const sections = await this.segmentContent(content, fileType);
      
      // Save document metadata to database
      const documentId = await this.saveDocumentMetadata(originalName, fileType, filePath, content, sections);
      
      // Process and store sections with embeddings
      await this.processSections(documentId, sections);
      
      // Mark document as processed
      await this.markDocumentProcessed(documentId);
      
      console.log(`Document processed successfully: ${originalName}`);
      return documentId;
      
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  async extractContent(filePath, fileType) {
    const buffer = await fs.readFile(filePath);
    
    switch (fileType.toLowerCase()) {
      case '.pdf':
        const pdfData = await pdfParse(buffer);
        return pdfData.text;
        
      case '.docx':
        const docxResult = await mammoth.extractRawText({ buffer });
        return docxResult.value;
        
      case '.xlsx':
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        let content = '';
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const sheetData = xlsx.utils.sheet_to_txt(sheet);
          content += `Sheet: ${sheetName}\n${sheetData}\n\n`;
        });
        return content;
        
      case '.txt':
        return buffer.toString('utf-8');
        
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
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

  async processSections(documentId, sections) {
    const client = await pool.connect();
    const index = getPineconeIndex();
    
    try {
      for (const section of sections) {
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
      client.release();
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
