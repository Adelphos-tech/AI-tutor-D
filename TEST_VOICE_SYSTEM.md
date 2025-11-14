# 🧪 Voice System Test Guide

## ✅ Stack Status

### Backend (Port 8000)
- ✅ **Running**: FastAPI server active
- ✅ **Health**: `/health` endpoint responding
- ✅ **WebSocket**: `/ws` accepting connections
- ✅ **Deepgram STT**: Nova-3 connected
- ✅ **Gemini 2.5 Pro**: Initialized
- ✅ **Deepgram TTS**: Aura-1 ready

### Frontend (Port 3000)
- ✅ **Running**: Next.js server active
- ✅ **Database**: Connected
- ✅ **Component**: VoiceTeacherRealtime loaded

---

## 🎯 Manual Test Steps

### Step 1: Verify Backend
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy"}
```

### Step 2: Open Frontend
```
http://localhost:3000/library
```

### Step 3: Upload/Select Document
1. Upload a PDF or select existing material
2. Click on the material to open it

### Step 4: Start Voice Session
1. Click **"Voice Teacher"** tab
2. Click **"Start Realtime Session"**
3. Wait for **green "Ready"** badge

### Step 5: Test Speaking
1. Click **"Start Talking"** button
2. Speak clearly: **"Hello, can you hear me?"**
3. Watch for:
   - 🎙️ Red "Listening..." badge
   - 📝 Live transcript appearing
   - 🔵 Blue "AI Speaking..." badge
   - 🔊 Audio response playing

---

## 📊 What to Monitor

### Browser Console (F12)
```
✅ Connected to voice backend
📊 Status: connected
🎙️ Starting recording...
✅ Recording started
📝 Transcript: Hello (interim)
📝 Transcript: Hello, can you hear me? (final)
💬 Text chunk: Hi there!
🔊 Playing audio chunk
```

### Backend Logs
```bash
# In voice-backend directory:
tail -f /tmp/server.log

# Or check the running process output
```

Expected logs:
```
🔌 Client connected
✅ Deepgram STT (Nova-3) connected
✅ Gemini 2.5 Pro initialized
✅ Deepgram TTS (Aura-1) ready
🚀 All streaming connections initialized
🎙️ Received audio chunk: XXXX bytes
✅ Sent XXXX bytes to Deepgram STT
📝 Transcript: Hello, can you hear me?
🎤 Utterance end detected
🧠 Generating response for: Hello, can you hear me?
🔊 Converting to speech: Hi there!...
✅ TTS chunk complete
```

---

## 🐛 Troubleshooting

### No "Ready" Badge
**Problem**: Connection not establishing

**Check**:
```bash
# Backend running?
curl http://localhost:8000/health

# WebSocket accessible?
wscat -c ws://localhost:8000/ws
```

**Fix**: Restart backend
```bash
cd voice-backend
./start.sh
```

### No Transcript Appearing
**Problem**: STT not receiving audio

**Check Browser Console**:
- Look for "Recording started"
- Check microphone permissions
- Verify audio chunks being sent

**Check Backend Logs**:
- Look for "Received audio chunk"
- Check Deepgram connection status

### No AI Response
**Problem**: LLM or TTS failing

**Check Backend Logs**:
- Look for "Generating response"
- Check for Gemini errors
- Verify API keys in `.env`

### No Audio Playback
**Problem**: TTS or playback failing

**Check**:
- Browser audio permissions
- System volume
- Look for "Playing audio chunk" in console

---

## 🎯 Expected Latency

| Stage | Target | Acceptable |
|-------|--------|------------|
| **Connection** | <500ms | <1s |
| **STT (Speech → Text)** | 150-200ms | <500ms |
| **LLM (First Token)** | 400-500ms | <1s |
| **TTS (Text → Audio)** | 250-300ms | <500ms |
| **Total (End-to-End)** | **<1s** | **<2s** |

---

## ✅ Success Criteria

Your system is working when:

1. ✅ Backend health check passes
2. ✅ WebSocket connects (green badge)
3. ✅ Recording starts (red badge)
4. ✅ Live transcript appears as you speak
5. ✅ AI responds within 1-2 seconds
6. ✅ Audio plays smoothly
7. ✅ No errors in console or logs

---

## 🚀 Test Scenarios

### Scenario 1: Simple Greeting
**Say**: "Hello"

**Expected**:
- Transcript: "Hello"
- Response: "Hi there! I'm Alex, your AI tutor..."
- Latency: <1 second

### Scenario 2: Question
**Say**: "What is machine learning?"

**Expected**:
- Transcript: "What is machine learning?"
- Response: Detailed explanation
- Latency: 1-2 seconds

### Scenario 3: Document Question
**Say**: "What is chapter 3 about?"

**Expected**:
- Transcript: "What is chapter 3 about?"
- Backend searches document
- Response: Content from chapter 3
- Latency: 2-3 seconds

### Scenario 4: Barge-in (Interrupt)
1. Start speaking
2. While AI is responding, speak again
3. AI should stop and listen to new input

---

## 📝 Test Results

Date: _______________

| Test | Status | Notes |
|------|--------|-------|
| Backend Health | ⬜ Pass ⬜ Fail | |
| WebSocket Connect | ⬜ Pass ⬜ Fail | |
| STT (Transcription) | ⬜ Pass ⬜ Fail | |
| LLM (Response) | ⬜ Pass ⬜ Fail | |
| TTS (Audio) | ⬜ Pass ⬜ Fail | |
| End-to-End Latency | _____ ms | |
| Barge-in | ⬜ Pass ⬜ Fail | |

---

## 🎉 Next Steps

Once all tests pass:

1. ✅ Test with different questions
2. ✅ Test with uploaded documents
3. ✅ Test barge-in functionality
4. ✅ Measure actual latency
5. ✅ Test in different browsers
6. ✅ Test with different microphones

---

## 📞 Quick Commands

```bash
# Check backend health
curl http://localhost:8000/health

# Restart backend
cd voice-backend && ./start.sh

# Restart frontend
cd intellitutor && npm run dev

# View backend logs
tail -f voice-backend/logs/*.log

# Test WebSocket
wscat -c ws://localhost:8000/ws
```

---

**Your real-time voice AI system is ready for testing!** 🚀

Follow the steps above and report any issues you encounter.
