# 🧪 Quick Test Instructions

## Backend Status
✅ **Running** on http://localhost:8000
✅ **Health**: Healthy
✅ **Detailed logging**: Enabled

## Test Now:

1. **Refresh browser**: http://localhost:3000/material/[your-id]
2. **Click**: "Voice Teacher" tab
3. **Click**: "Start Realtime Session"

## Watch Backend Logs:

Open a new terminal and run:
```bash
cd /Users/shivang/Desktop/Adelphos\ ai\ tutor/voice-backend
tail -f backend.log
```

## Expected Detailed Logs:

```
🔌 Client connected
🎙️ Voice pipeline created
🔌 Initializing streaming connections...
🔧 Creating Deepgram client...
🔑 API Key (first 10 chars): b25ae131af...
✅ Deepgram client created
🔧 Creating live transcription connection...
✅ Live transcription object created
🔧 Configuring STT options...
✅ STT options: model=nova-3, language=en-US
🔧 Setting up event handlers...
✅ Event handlers registered
🔧 Starting Deepgram connection (this may take 10-20 seconds)...
🔌 Deepgram WebSocket OPENED
📊 Start result: True
✅ Deepgram STT (Nova-3) connected
✅ Gemini 2.5 Pro initialized
✅ Deepgram TTS (Aura-1) ready
🚀 All streaming connections initialized
✅ Pipeline initialized
```

## If It Fails:

The logs will show exactly where and why:
- ❌ Network timeout
- ❌ SSL issues  
- ❌ API key problems
- ❌ WebSocket connection failures

## Browser Console:

Should show:
```
✅ Connected to voice backend
📊 Status: connected
```

---

**Try it now and share the backend.log output!** 🎯
