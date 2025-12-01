const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_size INTEGER NOT NULL,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed BOOLEAN DEFAULT FALSE,
        content_preview TEXT,
        total_chunks INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}'
      )
    `);

    // Document chapters/sections table
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_sections (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        section_title VARCHAR(500) NOT NULL,
        section_number INTEGER NOT NULL,
        content TEXT NOT NULL,
        word_count INTEGER DEFAULT 0,
        start_page INTEGER,
        end_page INTEGER,
        vector_ids TEXT[], -- Array of Pinecone vector IDs
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chat sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        section_id INTEGER REFERENCES document_sections(id) ON DELETE CASCADE,
        session_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        message_count INTEGER DEFAULT 0
      )
    `);

    // Chat messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_processed ON documents(processed);
      CREATE INDEX IF NOT EXISTS idx_document_sections_doc_id ON document_sections(document_id);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_doc_section ON chat_sessions(document_id, section_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initializeDatabase
};
