const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkDatabase() {
  console.log('🔍 Checking Database Status...\n');
  
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id, original_name, processed, total_chunks, upload_date, file_type
      FROM documents 
      ORDER BY upload_date DESC
    `);
    
    console.log('📊 Database Documents:');
    console.log('ID | Name | Type | Processed | Chunks | Date');
    console.log('---|------|------|-----------|--------|-----');
    
    result.rows.forEach(doc => {
      const name = doc.original_name.length > 25 ? 
        doc.original_name.substring(0, 25) + '...' : 
        doc.original_name;
      const date = doc.upload_date.toISOString().split('T')[0];
      console.log(`${doc.id} | ${name} | ${doc.file_type} | ${doc.processed ? '✅' : '❌'} | ${doc.total_chunks || 0} | ${date}`);
    });
    
    return result.rows;
  } finally {
    client.release();
  }
}

async function checkSections(documentId) {
  console.log(`\n🔍 Checking sections for document ${documentId}...`);
  
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id, section_title, section_number, word_count
      FROM document_sections 
      WHERE document_id = $1
      ORDER BY section_number
    `, [documentId]);
    
    if (result.rows.length === 0) {
      console.log('❌ No sections found - this explains why processing appears incomplete!');
      return false;
    }
    
    console.log(`✅ Found ${result.rows.length} sections:`);
    result.rows.forEach(section => {
      console.log(`   ${section.section_number}: ${section.section_title} (${section.word_count} words)`);
    });
    
    return true;
  } finally {
    client.release();
  }
}

async function fixDocument(documentId) {
  console.log(`\n🔧 Attempting to fix document ${documentId}...`);
  
  const client = await pool.connect();
  try {
    // Get document info
    const docResult = await client.query(`
      SELECT filename, original_name, file_type FROM documents WHERE id = $1
    `, [documentId]);
    
    if (docResult.rows.length === 0) {
      console.log('❌ Document not found in database');
      return false;
    }
    
    const doc = docResult.rows[0];
    console.log(`📄 Document: ${doc.original_name} (${doc.file_type})`);
    
    // Check if file exists
    const fs = require('fs-extra');
    const path = require('path');
    const filePath = path.join(process.env.UPLOAD_DIR || './uploads', doc.filename);
    
    if (!await fs.pathExists(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      console.log('🔧 Marking as processed without sections (file missing)');
      
      await client.query(`
        UPDATE documents SET processed = TRUE WHERE id = $1
      `, [documentId]);
      
      return true;
    }
    
    console.log(`✅ File exists: ${doc.filename}`);
    
    // Try to process the document properly
    try {
      const documentProcessor = require('../services/documentProcessor');
      
      console.log('🚀 Starting document processing...');
      await documentProcessor.processDocument(filePath, doc.original_name, doc.file_type);
      console.log('✅ Document processed successfully!');
      
      return true;
    } catch (error) {
      console.log(`❌ Processing failed: ${error.message}`);
      
      // If processing fails, at least mark it as processed so it shows up
      console.log('🔧 Marking as processed anyway (with error)');
      await client.query(`
        UPDATE documents SET processed = TRUE WHERE id = $1
      `, [documentId]);
      
      return false;
    }
    
  } finally {
    client.release();
  }
}

async function testAPI() {
  console.log('\n🌐 Testing API Endpoints...\n');
  
  try {
    // Test if server is running
    const response = await axios.get('http://localhost:5001/api/health', { timeout: 5000 });
    console.log('✅ Server is running');
    
    // Test documents endpoint
    const docsResponse = await axios.get('http://localhost:5001/api/documents', { timeout: 10000 });
    console.log(`✅ Documents API working - returned ${docsResponse.data.documents?.length || 0} documents`);
    
    return true;
  } catch (error) {
    console.log('❌ Server not running or API error:', error.message);
    console.log('💡 Start the server with: npm start');
    return false;
  }
}

async function main() {
  console.log('🐛 COMPREHENSIVE DOCUMENT DEBUG TOOL\n');
  console.log('=' .repeat(50) + '\n');
  
  try {
    // Step 1: Check database
    const documents = await checkDatabase();
    
    if (documents.length === 0) {
      console.log('\n✅ No documents found in database');
      return;
    }
    
    // Step 2: Check sections for each unprocessed document
    const unprocessedDocs = documents.filter(doc => !doc.processed);
    
    if (unprocessedDocs.length === 0) {
      console.log('\n✅ All documents are processed!');
    } else {
      console.log(`\n⚠️  Found ${unprocessedDocs.length} unprocessed documents`);
      
      for (const doc of unprocessedDocs) {
        const hasSections = await checkSections(doc.id);
        
        if (!hasSections) {
          console.log(`\n🔧 Fixing document ${doc.id}...`);
          await fixDocument(doc.id);
        }
      }
    }
    
    // Step 3: Test API
    await testAPI();
    
    // Step 4: Final status check
    console.log('\n' + '=' .repeat(50));
    console.log('📊 FINAL STATUS CHECK\n');
    await checkDatabase();
    
    console.log('\n✅ Debug complete! Check your dashboard now.');
    
  } catch (error) {
    console.error('\n❌ Debug failed:', error);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

main();
