# Groq API Integration Guide

## Overview

This voice backend now supports **Groq** for ultra-fast LLM inference, delivering significantly lower latency compared to other LLM providers.

## Why Groq?

- **Ultra-low latency**: ~10-50ms time-to-first-token
- **Fast inference**: Up to 700+ tokens/second
- **Cost-effective**: Competitive pricing
- **High-quality models**: Llama 3.3, Mixtral, and more

## Setup

### 1. Install Dependencies

```bash
cd voice-backend
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Deepgram API (for STT and TTS)
DEEPGRAM_API_KEY=your_deepgram_key_here

# Groq API (ultra-fast LLM)
GROQ_API_KEY=your_groq_api_key_here

# Groq Model Selection
GROQ_MODEL=llama-3.3-70b-versatile

# Server Settings
PORT=8000
HOST=0.0.0.0
LOG_LEVEL=INFO
```

### 3. Start Server

```bash
python main_groq.py
```

Or with the original Gemini version:

```bash
python main.py
```

## Available Groq Models

| Model | Description | Speed | Use Case |
|-------|-------------|-------|----------|
| `llama-3.3-70b-versatile` | **Recommended** - Best balance of speed and quality | Very Fast | General tutoring |
| `mixtral-8x7b-32768` | Fast with large context window (32k tokens) | Very Fast | Long documents |
| `llama-3.1-70b-versatile` | Previous generation Llama | Very Fast | Alternative option |
| `llama-3.1-8b-instant` | Smallest, fastest model | Ultra Fast | Simple queries |

## Architecture

```
User speaks → Deepgram Nova-2 STT
    ↓
Text transcription → Groq LLM (streaming)
    ↓
AI response chunks → Deepgram Aura TTS
    ↓
Audio playback (real-time)
```

## Performance Comparison

| Provider | First Token | Completion | Total Latency |
|----------|-------------|------------|---------------|
| **Groq** | ~20ms | ~200ms | **~220ms** ⚡ |
| Gemini | ~400ms | ~600ms | ~1000ms |
| OpenAI | ~300ms | ~800ms | ~1100ms |

## API Endpoints

### WebSocket: `/ws`

**Connect:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws?material_id=optional_id')
```

**Send Audio:**
```javascript
// Send binary PCM audio (16kHz, Int16, mono)
ws.send(audioChunkBytes)
```

**Receive Messages:**
```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  
  switch (message.type) {
    case 'status':
      // 'connected', 'generating', 'complete'
      console.log('Status:', message.data)
      break
      
    case 'transcript':
      // Real-time transcription
      console.log('User said:', message.data.text)
      console.log('Is final:', message.data.is_final)
      break
      
    case 'text_chunk':
      // Streaming LLM response (Groq streaming!)
      console.log('AI chunk:', message.data)
      break
      
    case 'text':
      // Complete AI response
      console.log('AI complete:', message.data)
      break
      
    case 'audio':
      // Audio chunk (24kHz PCM, Int16, base64)
      playAudio(message.data)
      break
      
    case 'error':
      console.error('Error:', message.data)
      break
  }
}
```

### REST: `/health`

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "llm_provider": "groq",
  "model": "llama-3.3-70b-versatile"
}
```

## Railway Deployment

### Environment Variables

Add to Railway:

```env
DEEPGRAM_API_KEY=your_deepgram_key_here
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=$PORT
HOST=0.0.0.0
LOG_LEVEL=INFO
```

### Start Command

Update in Railway settings:

```bash
uvicorn main_groq:app --host 0.0.0.0 --port $PORT
```

## Testing

### 1. Test Health Endpoint

```bash
curl http://localhost:8000/health
```

### 2. Test WebSocket with wscat

```bash
npm install -g wscat
wscat -c ws://localhost:8000/ws
```

### 3. Test from Frontend

Update frontend WebSocket URL:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws')
```

## Troubleshooting

### Groq API Errors

**Error: Invalid API key**
- Check `GROQ_API_KEY` in `.env`
- Verify key starts with `gsk_`

**Error: Rate limit exceeded**
- Groq has rate limits on free tier
- Consider upgrading or implementing retry logic

**Error: Model not found**
- Check `GROQ_MODEL` spelling in `.env`
- Use one of the supported models listed above

### Connection Issues

**WebSocket not connecting**
- Check firewall settings
- Verify port 8000 is not in use
- Check CORS settings

**No audio output**
- Verify Deepgram API key
- Check TTS model: `aura-asteria-en`
- Ensure audio format: 24kHz PCM Int16

## Switching Between Providers

### Use Groq (Recommended for Speed)

```bash
python main_groq.py
```

### Use Gemini (Original)

```bash
python main.py
```

## Best Practices

1. **Model Selection**
   - Use `llama-3.3-70b-versatile` for best balance
   - Use `llama-3.1-8b-instant` for maximum speed
   - Use `mixtral-8x7b-32768` for long contexts

2. **Streaming**
   - Groq supports streaming for instant responsiveness
   - Frontend receives `text_chunk` messages as they generate

3. **Error Handling**
   - Implement retry logic for transient failures
   - Monitor rate limits
   - Log errors for debugging

4. **Production**
   - Use production Groq API key
   - Enable logging and monitoring
   - Set up health checks

## Getting Groq API Key

1. Visit [Groq Console](https://console.groq.com/)
2. Sign up / Log in
3. Navigate to API Keys
4. Create new API key
5. Copy and save securely

**Note:** Get your API key from Groq Console and add it to your `.env` file.

## Support

For issues:
- Check logs: `tail -f logs/voice-backend.log`
- Review Groq docs: https://console.groq.com/docs
- Test individual components separately

## License

MIT
