# AI Tutor Python Voice Service

A Python-based microservice for voice processing using the Deepgram Python SDK, integrated with the AI Academic Tutor application.

## Features

- **Speech-to-Text**: High-accuracy transcription using Deepgram Nova-2 model
- **Text-to-Speech**: Natural voice synthesis with multiple voice options
- **AI Integration**: Groq LLM for generating PhD-level tutor responses
- **Complete Voice Pipeline**: End-to-end voice chat functionality
- **FastAPI**: Modern, fast web framework with automatic API documentation

## Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)

### Quick Start

1. **Navigate to the service directory:**
   ```bash
   cd python-voice-service
   ```

2. **Run the startup script:**
   ```bash
   ./start.sh
   ```

   This will:
   - Create a virtual environment
   - Install dependencies
   - Set up environment variables
   - Start the service on port 8000

### Manual Installation

1. **Create virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your API keys
   ```

4. **Start the service:**
   ```bash
   python voice_service.py
   ```

## API Endpoints

### Health Check
```http
GET /health
```
Returns service status and configuration.

### Transcribe Audio
```http
POST /transcribe
Content-Type: multipart/form-data

audio: <audio_file>
```
Transcribes uploaded audio file to text.

### Synthesize Speech
```http
POST /synthesize
Content-Type: multipart/form-data

text: <text_to_speak>
voice: <voice_id> (optional)
```
Converts text to speech audio.

### Voice Chat
```http
POST /voice-chat
Content-Type: multipart/form-data

audio: <audio_file>
session_id: <session_id>
context: <document_context> (optional)
```
Complete voice chat pipeline: transcribe → AI response → synthesize.

### Get Voices
```http
GET /voices
```
Returns list of available TTS voices.

## Available Voices

- **aura-asteria-en** - Asteria (Default)
- **aura-luna-en** - Luna
- **aura-stella-en** - Stella
- **aura-athena-en** - Athena
- **aura-hera-en** - Hera
- **aura-orion-en** - Orion
- **aura-arcas-en** - Arcas
- **aura-perseus-en** - Perseus
- **aura-angus-en** - Angus
- **aura-orpheus-en** - Orpheus
- **aura-helios-en** - Helios
- **aura-zeus-en** - Zeus

## Integration with Node.js App

The Python service is integrated with the main Node.js application through a proxy service (`services/pythonVoiceProxy.js`). The Node.js app will:

1. Try the Python service first for better performance
2. Fall back to the JavaScript Deepgram SDK if Python service is unavailable
3. Provide seamless integration without changing the frontend

## Configuration

### Environment Variables

```env
DEEPGRAM_API_KEY=your_deepgram_api_key
GROQ_API_KEY=your_groq_api_key
```

### Service URL
The Node.js app expects the Python service to run on `http://localhost:8000`. You can change this by setting:

```env
PYTHON_VOICE_SERVICE_URL=http://localhost:8000
```

## Development

### API Documentation
Once the service is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Logging
The service uses Python's built-in logging. Logs include:
- Request processing information
- Audio file details
- Transcription results
- Error messages

### Testing
Test the service endpoints:

```bash
# Health check
curl http://localhost:8000/health

# Get voices
curl http://localhost:8000/voices

# Test transcription (with audio file)
curl -X POST -F "audio=@test.wav" http://localhost:8000/transcribe
```

## Troubleshooting

### Common Issues

1. **Service won't start**
   - Check Python version: `python3 --version`
   - Verify API keys in `.env` file
   - Check port 8000 is not in use: `lsof -i :8000`

2. **Transcription fails**
   - Verify Deepgram API key is valid
   - Check audio file format (supports WebM, WAV, MP3, MP4)
   - Ensure audio file is not corrupted

3. **TTS fails**
   - Verify Deepgram API key has TTS permissions
   - Check text input is not empty
   - Try different voice models

4. **AI responses fail**
   - Verify Groq API key is valid
   - Check Groq service status
   - Ensure text input is reasonable length

### Performance Tips

- Use WebM audio format for best browser compatibility
- Keep audio files under 10MB for faster processing
- Use shorter text inputs for faster TTS generation
- Monitor service logs for performance insights

## Architecture

```
Frontend (React) 
    ↓
Node.js API Server (port 5001)
    ↓
Python Voice Service (port 8000)
    ↓
Deepgram API + Groq API
```

The Python service provides enhanced voice processing capabilities while maintaining compatibility with the existing Node.js application architecture.
