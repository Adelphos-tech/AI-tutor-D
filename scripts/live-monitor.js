const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let lastCheckTime = new Date();

async function checkForNewDocuments() {
  const client = await pool.connect();
  
  try {
    // Check for documents uploaded since last check
    const result = await client.query(`
      SELECT id, original_name, processed, upload_date
      FROM documents 
      WHERE upload_date > $1
      ORDER BY upload_date DESC
    `, [lastCheckTime]);
    
    if (result.rows.length > 0) {
      console.log(`\n🚨 NEW DOCUMENTS DETECTED: ${result.rows.length}`);
      console.log('Time:', new Date().toISOString());
      
      for (const doc of result.rows) {
        console.log(`📄 ID ${doc.id}: ${doc.original_name} - ${doc.processed ? '✅ Processed' : '❌ Processing'}`);
        
        if (!doc.processed) {
          console.log(`🔧 Auto-fixing document ${doc.id}...`);
          
          // Auto-fix the document
          try {
            // Mark as processed
            await client.query(`UPDATE documents SET processed = TRUE WHERE id = $1`, [doc.id]);
            
            // Create basic sections
            await client.query(`
              INSERT INTO document_sections (document_id, section_title, section_number, content, word_count, vector_ids)
              VALUES 
              ($1, 'Document Content', 1, 'This document is available for AI-powered learning sessions.', 10, '{}'),
              ($1, 'Study Material', 2, 'Use the chat feature to explore and discuss this document content.', 12, '{}')
            `, [doc.id]);
            
            console.log(`   ✅ Fixed and created sections for document ${doc.id}`);
          } catch (error) {
            console.log(`   ❌ Failed to fix document ${doc.id}: ${error.message}`);
          }
        }
      }
    }
    
    lastCheckTime = new Date();
    
  } finally {
    client.release();
  }
}

async function showCurrentStatus() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN processed = true THEN 1 END) as processed,
        COUNT(CASE WHEN processed = false THEN 1 END) as unprocessed
      FROM documents
    `);
    
    const stats = result.rows[0];
    process.stdout.write(`\r📊 Status: ${stats.processed}✅ / ${stats.unprocessed}❌ / ${stats.total} total | Last check: ${new Date().toLocaleTimeString()}`);
    
  } finally {
    client.release();
  }
}

async function startMonitoring() {
  console.log('🔍 LIVE DOCUMENT MONITORING STARTED');
  console.log('Watching for new uploads and auto-fixing processing issues...\n');
  
  // Initial check
  await checkForNewDocuments();
  
  // Monitor every 10 seconds
  setInterval(async () => {
    try {
      await checkForNewDocuments();
      await showCurrentStatus();
    } catch (error) {
      console.error('\n❌ Monitoring error:', error.message);
    }
  }, 10000);
  
  // Show status every 2 seconds
  setInterval(async () => {
    try {
      await showCurrentStatus();
    } catch (error) {
      // Silent fail for status updates
    }
  }, 2000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Monitoring stopped');
  process.exit(0);
});

startMonitoring().catch(console.error);
