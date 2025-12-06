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

// Health check endpoint (must be before catch-all route)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/voice', voiceRoutes);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, 'client/build');
  const indexPath = path.join(buildPath, 'index.html');
  
  console.log('Production mode - serving static files from:', buildPath);
  console.log('Index.html exists:', fs.existsSync(indexPath));
  
  app.use(express.static(buildPath));
  
  // Serve public files (including fallback pages)
  app.use(express.static(path.join(__dirname, 'client/public')));
  
  // DIRECT UPLOAD ROUTE - bypasses React completely for mobile
  app.get('/upload', (req, res) => {
    const userAgent = req.get('User-Agent') || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    if (isMobile) {
      console.log('📱 Mobile device detected - serving direct upload page');
      const uploadPath = path.join(buildPath, 'upload-fallback.html');
      
      if (fs.existsSync(uploadPath)) {
        res.sendFile(uploadPath);
        return;
      }
    }
    
    // For desktop or if mobile fallback not found, serve React app
    console.log('🖥️ Desktop or fallback - serving React app');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('React app not found');
    }
  });

  // Keep fallback route for direct access
  app.get('/upload-fallback', (req, res) => {
    const uploadPath = path.join(buildPath, 'upload-fallback.html');
    if (fs.existsSync(uploadPath)) {
      res.sendFile(uploadPath);
    } else {
      res.status(404).send('Upload page not found');
    }
  });

  // Catch-all handler: send back React's index.html file for any non-API routes
  app.get('*', (req, res) => {
    console.log('Serving React app for route:', req.path);
    
    if (fs.existsSync(indexPath)) {
      // Simple, fast serving - no complex injection
      res.sendFile(indexPath);
    } else {
      console.error('❌ index.html not found at:', indexPath);
      res.status(404).send(`
        <html>
          <body>
            <h1>Build Error</h1>
            <p>React build files not found at: ${buildPath}</p>
            <p>Index.html path: ${indexPath}</p>
            <p>Files in build directory:</p>
            <pre>${fs.existsSync(buildPath) ? fs.readdirSync(buildPath).join('\n') : 'Build directory does not exist'}</pre>
            <p><a href="/upload-fallback.html">Try Upload Fallback Page</a></p>
          </body>
        </html>
      `);
    }
  });
} else {
  console.log('Development mode - not serving static files');
}

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
