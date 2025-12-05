const { Pool } = require('pg');
const documentProcessor = require('../services/documentProcessor');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function getUnprocessedDocuments() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT id, filename, original_name, file_type, processed, upload_date
      FROM documents
      WHERE processed = FALSE
      ORDER BY upload_date DESC
    `);
    
    return result.rows;
  } finally {
    client.release();
  }
}

async function processDocument(doc) {
  console.log(`\n🔄 Processing: ${doc.original_name} (ID: ${doc.id})`);
  
  try {
    const filePath = path.join(process.env.UPLOAD_DIR || './uploads', doc.filename);
    
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      console.log(`❌ File not found: ${doc.filename}`);
      console.log(`   Expected path: ${filePath}`);
      
      // Mark as processed to remove from stuck state
      await markAsProcessed(doc.id);
      return false;
    }
    
    console.log(`📁 File found: ${doc.filename}`);
    
    // Process the document
    await documentProcessor.processDocument(filePath, doc.original_name, doc.file_type);
    
    console.log(`✅ Successfully processed: ${doc.original_name}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error processing ${doc.original_name}:`, error.message);
    
    // For debugging, let's see what went wrong
    if (error.message.includes('Pinecone')) {
      console.log('   Issue: Pinecone connection problem');
    } else if (error.message.includes('embedding')) {
      console.log('   Issue: Embedding generation problem');
    } else if (error.message.includes('database')) {
      console.log('   Issue: Database connection problem');
    }
    
    return false;
  }
}

async function markAsProcessed(documentId) {
  const client = await pool.connect();
  
  try {
    await client.query(`
      UPDATE documents SET processed = TRUE WHERE id = $1
    `, [documentId]);
    console.log(`   Marked document ${documentId} as processed`);
  } finally {
    client.release();
  }
}

async function testServices() {
  console.log('🧪 Testing required services...\n');
  
  // Test database connection
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database connection: OK');
  } catch (error) {
    console.log('❌ Database connection: FAILED');
    console.log('   Error:', error.message);
    return false;
  }
  
  // Test Pinecone connection
  try {
    const { initializePinecone, getPineconeIndex } = require('../config/pinecone');
    await initializePinecone();
    const index = getPineconeIndex();
    console.log('✅ Pinecone connection: OK');
  } catch (error) {
    console.log('❌ Pinecone connection: FAILED');
    console.log('   Error:', error.message);
    return false;
  }
  
  // Test embedding service
  try {
    const embeddingService = require('../services/embeddings');
    await embeddingService.initialize();
    console.log('✅ Embedding service: OK');
  } catch (error) {
    console.log('❌ Embedding service: FAILED');
    console.log('   Error:', error.message);
    return false;
  }
  
  return true;
}

async function main() {
  console.log('🔧 Document Processing Fix Tool\n');
  
  // Test all services first
  const servicesOK = await testServices();
  if (!servicesOK) {
    console.log('\n❌ Some services are not working. Please fix the issues above first.');
    process.exit(1);
  }
  
  // Get unprocessed documents
  const unprocessedDocs = await getUnprocessedDocuments();
  
  if (unprocessedDocs.length === 0) {
    console.log('\n✅ No unprocessed documents found!');
    process.exit(0);
  }
  
  console.log(`\n📋 Found ${unprocessedDocs.length} unprocessed documents:`);
  unprocessedDocs.forEach(doc => {
    console.log(`   ${doc.id}: ${doc.original_name} (${doc.file_type})`);
  });
  
  console.log('\n🚀 Starting processing...');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const doc of unprocessedDocs) {
    const success = await processDocument(doc);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n📊 Processing Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📝 Total: ${unprocessedDocs.length}`);
  
  if (successCount > 0) {
    console.log('\n🎉 Some documents were successfully processed!');
  }
  
  if (failCount > 0) {
    console.log('\n⚠️  Some documents failed to process. Check the errors above.');
  }
  
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

main();
