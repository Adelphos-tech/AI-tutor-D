const { Pool } = require('pg');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function deleteDocument(documentId) {
  const client = await pool.connect();
  
  try {
    // Get document info first
    const docResult = await client.query(`
      SELECT filename, original_name FROM documents WHERE id = $1
    `, [documentId]);
    
    if (docResult.rows.length === 0) {
      console.log(`❌ Document with ID ${documentId} not found`);
      return false;
    }
    
    const { filename, original_name } = docResult.rows[0];
    console.log(`🗑️  Deleting document: ${original_name} (ID: ${documentId})`);
    
    // Delete from database (cascades to sections and sessions)
    await client.query(`DELETE FROM documents WHERE id = $1`, [documentId]);
    
    // Delete physical file
    const filePath = path.join(process.env.UPLOAD_DIR || './uploads', filename);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      console.log(`📁 Deleted file: ${filename}`);
    } else {
      console.log(`⚠️  File not found: ${filename}`);
    }
    
    console.log(`✅ Successfully deleted document: ${original_name}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error deleting document ${documentId}:`, error.message);
    return false;
  } finally {
    client.release();
  }
}

async function listDocuments() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT id, original_name, file_type, upload_date, processed
      FROM documents
      ORDER BY upload_date DESC
    `);
    
    console.log('\n📚 Current Documents:');
    console.log('ID | Name | Type | Date | Processed');
    console.log('---|------|------|------|----------');
    
    result.rows.forEach(doc => {
      console.log(`${doc.id} | ${doc.original_name} | ${doc.file_type} | ${doc.upload_date.toISOString().split('T')[0]} | ${doc.processed ? '✅' : '⏳'}`);
    });
    
    return result.rows;
    
  } catch (error) {
    console.error('❌ Error listing documents:', error.message);
    return [];
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚀 Document Deletion Tool\n');
  
  // List current documents
  const documents = await listDocuments();
  
  if (documents.length === 0) {
    console.log('No documents found.');
    process.exit(0);
  }
  
  // Get document IDs from command line arguments
  const idsToDelete = process.argv.slice(2).map(id => parseInt(id)).filter(id => !isNaN(id));
  
  if (idsToDelete.length === 0) {
    console.log('\n💡 Usage: node scripts/delete-documents.js <document_id1> <document_id2> ...');
    console.log('Example: node scripts/delete-documents.js 1 2');
    process.exit(1);
  }
  
  console.log(`\n🗑️  Attempting to delete documents with IDs: ${idsToDelete.join(', ')}\n`);
  
  // Delete each document
  for (const id of idsToDelete) {
    await deleteDocument(id);
  }
  
  console.log('\n✅ Deletion process completed');
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

main();
