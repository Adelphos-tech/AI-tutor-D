# 🧪 Test Instructions - Voice System with RAG

## ✅ All Changes Applied!

### What's Fixed:
1. ✅ Material ID now passed via WebSocket URL
2. ✅ Auto-send after 2 seconds of silence
3. ✅ RAG search will work with document content

## 🚀 How to Test

### Step 1: Hard Refresh Browser
**Important**: Clear the cache!
- **Mac**: `Cmd + Shift + R`
- **Windows**: `Ctrl + Shift + R`

### Step 2: Test Auto-Send Feature

1. Go to: http://localhost:3000/library
2. Open any document (e.g., the one with ID: `cmhuer2ck0001scdeoxf7b2c5`)
3. Click **"Voice Teacher"** tab
4. Click **"Start Realtime Session"**
5. Click **"Start Talking"**
6. **Say**: "Hello"
7. **DON'T CLICK "STOP TALKING"** - Just wait!
8. After 2 seconds, you should see in console:
   ```
   🤫 2 seconds of silence detected - auto-sending
   📤 Auto-sent audio_end signal
   ```
9. Get response!

### Step 3: Test RAG Integration

1. Keep the session active
2. Click **"Start Talking"** again
3. **Say**: "Can you summarize this book?"
4. **Wait 2 seconds** (don't click stop!)
5. Check backend logs should show:
   ```
   🔍 Searching documents for: Can you summarize this book?
   ✅ Found XXX chars of context
   ```
6. Get response with actual book content!

### Step 4: Test Continuous Conversation

1. Immediately after response, click **"Start Talking"** again
2. **Say**: "What is chapter 3 about?"
3. **Wait 2 seconds**
4. Get response!
5. Repeat - natural conversation flow!

## 📊 What to Watch

### Browser Console (Expected):
```
🔌 Connecting to voice backend...
✅ Connected to voice backend
📤 Material ID in URL: cmhuer2ck0001scdeoxf7b2c5
📊 Status: connected
🎙️ Starting recording...
✅ Recording started
🤫 2 seconds of silence detected - auto-sending  ← AUTO-SEND!
📤 Auto-sent audio_end signal
📝 Transcript: Can you summarize this book? (final)
📊 Status: generating
💬 Text chunk: [Response with book content]
📊 Status: speaking
📊 Status: complete
```

### Backend Logs (Expected):
```bash
tail -f backend.log
```

Should show:
```
🔌 Client connected (material_id: cmhuer2ck0001scdeoxf7b2c5)  ← Has ID!
✅ Pipeline initialized
🎤 Audio end - processing
🔊 Calling Deepgram STT API...
✅ Transcription complete: Can you summarize this book?
🔍 Searching documents for: Can you summarize this book?  ← RAG!
✅ Found 1500 chars of context
🧠 Generating response for: Can you summarize this book?
✅ Response generated: 250 chars
🔊 Converting to speech...
✅ TTS complete: 45000 bytes
```

## ✅ Success Criteria

Your system is working correctly when:

1. ✅ You see "Material ID in URL" in browser console
2. ✅ Backend shows "Client connected (material_id: cmhuer...)"
3. ✅ You see "🤫 2 seconds of silence detected" after speaking
4. ✅ Backend shows "🔍 Searching documents"
5. ✅ AI answers with actual book content
6. ✅ You don't need to click "Stop Talking"

## 🐛 If It's Not Working

### Material ID not showing?
```bash
# Check backend logs
tail -20 backend.log | grep "Client connected"

# Should show:
# 🔌 Client connected (material_id: cmhuer2ck0001scdeoxf7b2c5)

# If it shows (material_id: None), hard refresh browser!
```

### Auto-send not working?
- Make sure you **don't click "Stop Talking"**
- Wait full 2 seconds of silence
- Check console for "🤫 2 seconds of silence"
- If not appearing, hard refresh browser

### No book content in response?
- Check backend logs for "🔍 Searching documents"
- If not appearing, material_id might be None
- Hard refresh and try again

## 🎯 Quick Test Command

Run this to see if material_id is being received:
```bash
tail -f /Users/shivang/Desktop/Adelphos\ ai\ tutor/voice-backend/backend.log | grep -E "(Client connected|Searching documents)"
```

Then test in browser - you should see both lines appear!

## 🎉 Expected Result

After hard refresh and testing:
- ✅ Natural conversation (no manual stop)
- ✅ AI knows about the book
- ✅ Answers questions with actual content
- ✅ Continuous flow

**Hard refresh now and test!** 🚀
