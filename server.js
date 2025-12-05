const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const http = require('http');
require('dotenv').config();

const documentRoutes = require('./routes/documents');
const chatRoutes = require('./routes/chat');
const { router: voiceRoutes, setupVoiceWebSocket } = require('./routes/voice');
const { initializeDatabase } = require('./config/database');
const { initializePinecone } = require('./config/pinecone');

const app = express();
const PORT = process.env.PORT || 5001;

// Use environment variables for Pinecone configuration
// Set these in your .env file or deployment environment

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5001', 
    'https://ai-tutor-d-production.up.railway.app',
    'https://railway.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload directory exists
fs.ensureDirSync(process.env.UPLOAD_DIR || './uploads');

// Routes
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/voice', voiceRoutes);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Try to initialize database, but don't fail if it's not available
    if (process.env.DATABASE_URL) {
      console.log('Initializing database...');
      try {
        await initializeDatabase();
        console.log('Database connected successfully');
      } catch (error) {
        console.error('Database connection failed:', error.message);
        console.log('Continuing without database...');
      }
    } else {
      console.log('No DATABASE_URL found, skipping database initialization');
    }
    
    console.log('Initializing Pinecone...');
    await initializePinecone();
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Setup WebSocket for voice
    setupVoiceWebSocket(server);
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`WebSocket available at ws://localhost:${PORT}/api/voice/realtime`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
