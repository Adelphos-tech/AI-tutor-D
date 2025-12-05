const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function markAllAsProcessed() {
  const client = await pool.connect();
  
  try {
    // Get unprocessed documents
    const result = await client.query(`
      SELECT id, original_name FROM documents WHERE processed = FALSE
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ No unprocessed documents found!');
      return;
    }
    
    console.log(`📋 Found ${result.rows.length} unprocessed documents:`);
    result.rows.forEach(doc => {
      console.log(`   ${doc.id}: ${doc.original_name}`);
    });
    
    // Mark all as processed
    await client.query(`
      UPDATE documents SET processed = TRUE WHERE processed = FALSE
    `);
    
    console.log(`\n✅ Marked ${result.rows.length} documents as processed!`);
    console.log('📝 Note: Documents are marked as processed but embeddings were not generated.');
    console.log('🔧 To generate embeddings later, fix Pinecone configuration and re-run processing.');
    
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🔧 Quick Fix: Mark Documents as Processed\n');
  
  try {
    await markAllAsProcessed();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
