# AI Academic Tutor

An AI-powered academic tutoring application with document processing, RAG (Retrieval-Augmented Generation), and voice capabilities.

## Features

### 📚 Document Processing
- **Multi-format Support**: Upload PDF, DOCX, XLSX, and TXT files
- **Automatic Segmentation**: Documents are intelligently segmented into chapters/sections
- **Content Preview**: Quick preview of document content before processing

### 🤖 AI Tutoring
- **PhD-level Explanations**: Advanced AI tutor with deep subject knowledge
- **Section-scoped Learning**: AI knowledge is confined to selected document sections
- **Contextual Q&A**: RAG system provides accurate, document-specific responses
- **Conversational Memory**: Maintains context throughout learning sessions

### 🎙️ Voice Capabilities
- **Speech-to-Text**: Real-time voice input using Deepgram STT
- **Text-to-Speech**: Natural voice responses using Deepgram TTS
- **Voice Sessions**: Complete voice-based learning experience
- **Multiple Voices**: Choose from various AI voice personalities

### 💬 Dual Interaction Modes
- **Text Chat**: Traditional text-based conversations
- **Voice Chat**: Natural voice interactions with STT/TTS pipeline

## Technology Stack

### Backend
- **Node.js & Express**: RESTful API server
- **Python FastAPI**: Enhanced voice processing microservice
- **PostgreSQL (Neon)**: Document metadata storage
- **Pinecone**: Vector database for embeddings
- **Local Embeddings**: Xenova/transformers for text embeddings
- **Groq**: LLM for AI tutoring responses
- **Deepgram**: Speech-to-text and text-to-speech (Python SDK)
- **WebSocket**: Real-time voice communication

### Frontend
- **React**: Modern UI framework
- **TailwindCSS**: Utility-first styling
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **React Markdown**: Markdown rendering

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL database (Neon)
- API keys for Pinecone, Groq, and Deepgram

### Setup

1. **Clone and Install Dependencies**
   ```bash
   cd "AI deepgram tutor"
   npm run install-all
   ```

2. **Environment Configuration**
   
   The `.env` file is already configured with your API keys:
   ```env
   # Database
   NEON_DATABASE_URL=postgresql://neondb_owner:npg_GSkIyaPOmu13@ep-winter-band-a15la6ro-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   
   # Pinecone
   PINECONE_API_KEY=pcsk_5Hz83L_2hw1whLPQyToaMHdSzoqHmBYY2ud2DpTP3fq89zZArfCxu8EuhA2VvKMDNBdH37
   PINECONE_INDEX_NAME=new
   
   # Deepgram
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   
   # Groq
   GROQ_API_KEY=your_groq_api_key_here
   ```

3. **Start the Application**
   
   **Option A: Full Stack with Python Voice Service (Recommended)**
   ```bash
   # Terminal 1: Start Python Voice Service
   cd python-voice-service
   ./start.sh
   
   # Terminal 2: Start Node.js Backend
   PORT=5001 node server.js
   
   # Terminal 3: Start React Frontend
   cd client
   npm start
   ```
   
   **Option B: Node.js Only (Fallback)**
   ```bash
   npm run dev
   ```

   This will start:
   - Python voice service on `http://localhost:8000` (if using Option A)
   - Backend server on `http://localhost:5001`
   - Frontend development server on `http://localhost:3000`

## Usage

### 1. Upload Documents
- Navigate to the Upload page
- Drag and drop or select files (PDF, DOCX, XLSX, TXT)
- Wait for processing to complete

### 2. Start Learning Sessions
- Select a processed document from the dashboard
- Choose a section to focus on
- Start either a text or voice chat session

### 3. Text Chat
- Ask questions about the selected section
- Receive detailed, contextual responses
- View conversation history

### 4. Voice Chat
- Hold the microphone button to speak
- Release to stop recording
- Listen to AI responses with natural voice synthesis

## API Endpoints

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - List all documents
- `GET /api/documents/:id` - Get document details
- `DELETE /api/documents/:id` - Delete document

### Chat
- `POST /api/chat/sessions` - Create chat session
- `GET /api/chat/sessions/:id` - Get session with messages
- `POST /api/chat/sessions/:id/messages` - Send message
- `POST /api/chat/sessions/:id/stream` - Stream response

### Voice
- `POST /api/voice/transcribe` - Transcribe audio
- `POST /api/voice/synthesize` - Synthesize speech
- `POST /api/voice/chat/:sessionId` - Voice chat
- `WS /api/voice/realtime` - Real-time voice WebSocket

## Architecture

### Document Processing Pipeline
1. **Upload**: Files stored locally with metadata in PostgreSQL
2. **Content Extraction**: Text extracted based on file type
3. **Segmentation**: Content split into logical sections/chapters
4. **Embedding**: Text chunks converted to vectors using local transformers
5. **Storage**: Vectors stored in Pinecone, metadata in PostgreSQL

### RAG System
1. **Query Processing**: User questions converted to embeddings
2. **Similarity Search**: Relevant content chunks retrieved from Pinecone
3. **Context Assembly**: Retrieved chunks combined with section content
4. **Response Generation**: Groq LLM generates contextual responses

### Voice Pipeline (STT-LLM-TTS)
1. **Speech-to-Text**: Deepgram converts audio to text
2. **LLM Processing**: Text processed through RAG system
3. **Text-to-Speech**: Response converted to audio using Deepgram
4. **Playback**: Audio streamed to client

## Development

### Project Structure
```
├── server.js              # Main server file
├── config/                # Database and service configurations
├── services/              # Core business logic
├── routes/                # API route handlers
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   └── services/      # API client services
└── uploads/               # Document storage
```

### Key Services
- **DocumentProcessor**: Handles file processing and segmentation
- **EmbeddingService**: Local text embedding generation
- **LLMService**: Groq integration with PhD-level prompting
- **VoiceService**: Deepgram STT/TTS integration

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
Ensure all production environment variables are set:
- Database URLs
- API keys
- JWT secrets
- Upload directories

## Troubleshooting

### Common Issues

1. **Database Connection**
   - Verify Neon PostgreSQL connection string
   - Check network connectivity

2. **Pinecone Index**
   - Ensure "new-tutor" index exists
   - Verify API key permissions

3. **Voice Features**
   - Check microphone permissions
   - Verify Deepgram API key
   - Test audio device functionality

4. **File Upload**
   - Check file size limits (50MB)
   - Verify supported file types
   - Ensure upload directory permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check service status (Pinecone, Groq, Deepgram)
4. Create an issue with detailed error information
