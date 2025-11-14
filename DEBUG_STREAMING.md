# 🔍 Debug Streaming - Detailed Logs

## Test Instructions

### Step 1: Watch Backend Logs
Open terminal and run:
```bash
cd /Users/shivang/Desktop/Adelphos\ ai\ tutor/voice-backend
tail -f backend.log | grep -E "(Converting|Sending|Sent.*chunks|audio)"
```

### Step 2: Test in Browser
1. Refresh browser (Cmd+Shift+R)
2. Start session
3. Say: "Hello"
4. Watch both logs

### Expected Backend Logs:
```
🔊 Converting chunk to speech: Hello! How can I help...
📤 Sending 269208 bytes of audio in chunks
✅ Sent 66 audio chunks
🔊 Converting final chunk: That can drastically...
📤 Sending final 158310 bytes of audio
✅ Sent 39 final audio chunks
✅ Streaming complete: 149 chars total
```

### Expected Browser Console:
```
💬 Text chunk: Hello
💬 Text chunk: ! How can I help...
📊 Status: speaking
🔊 Playing audio chunk (should appear 66 times!)
💬 Text chunk:  that can drastically...
🔊 Playing audio chunk (should appear 39 more times!)
📊 Status: complete
```

## What to Check

### If NO audio chunks in backend:
- Audio is not being sent from backend
- Check TTS API is working

### If audio chunks in backend but NOT in browser:
- WebSocket not forwarding audio
- Check main.py send_responses function

### If audio chunks in browser but NOT playing:
- Frontend audio playback issue
- Check useRealtimeVoice.ts playAudioChunk function

## Current Status

✅ Backend: Streaming text chunks
✅ Backend: Converting to TTS
❓ Backend: Sending audio chunks? (check logs)
❓ Frontend: Receiving audio? (check console)
❓ Frontend: Playing audio? (check speakers)

**Run the test and share both logs!**
