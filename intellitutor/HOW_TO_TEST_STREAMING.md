# How to Test Streaming TTS

## 🧪 Quick Test Instructions

### **Step 1: Navigate to Test Page**

Open your browser and go to:
```
http://127.0.0.1:3000/test-streaming
```

### **Step 2: Click a Test Phrase**

You'll see 3 test buttons with different phrases:
1. Short phrase (quick test)
2. Medium phrase (normal test)
3. Long phrase (stress test)

Click any button to start the test.

### **Step 3: Observe the Results**

Watch for:
- ⚡ **Time to first chunk** - Should be under 1 second
- 📦 **Chunks received** - Should see multiple chunks
- 🎵 **Audio playback** - Should start quickly

### **Step 4: Check the Metrics**

After the test completes, you'll see:
```
✅ Test Complete
⚡ Time to first audio: XXXms
📦 Total chunks: X
```

## 📊 What Good Results Look Like

### **Excellent** 🎉
```
⚡ Time to first audio: 500-800ms
📦 Total chunks: 5-10
🎵 Audio starts playing immediately
```

### **Good** 👍
```
⚡ Time to first audio: 800-1500ms
📦 Total chunks: 3-8
🎵 Audio starts within 1.5 seconds
```

### **Needs Improvement** ⚠️
```
⚡ Time to first audio: >2000ms
📦 Total chunks: 1-2
🎵 Long wait before audio starts
```

## 🔍 What to Look For

### **1. Streaming is Working**
- Multiple chunks received (not just 1)
- Audio starts before all chunks arrive
- Progress updates in real-time

### **2. Low Latency**
- First chunk arrives in <1 second
- Audio playback starts quickly
- Feels responsive

### **3. No Errors**
- No red error messages
- Console is clean (no errors)
- Audio plays smoothly

## 🐛 Common Issues & Fixes

### **Issue: "HTTP error! status: 500"**
**Cause**: API endpoint error
**Fix**: 
1. Check server logs in terminal
2. Verify GEMINI_API_KEY is set
3. Restart the dev server

### **Issue: "No reader available"**
**Cause**: Streaming not supported
**Fix**:
1. Use a modern browser (Chrome, Edge, Firefox)
2. Check if response.body exists

### **Issue: High latency (>2s)**
**Cause**: Network or API slowness
**Fix**:
1. Check internet connection
2. Try shorter phrases
3. Verify API quota not exceeded

### **Issue: Only 1 chunk received**
**Cause**: Not actually streaming
**Fix**:
1. Check that `generateContentStream` is being used
2. Verify the streaming endpoint is correct
3. Check browser network tab for streaming response

## 📝 Manual Testing Checklist

- [ ] Navigate to `/test-streaming`
- [ ] Click "Short phrase" test
- [ ] Verify time to first chunk < 1s
- [ ] Verify multiple chunks received
- [ ] Verify audio plays
- [ ] Click "Medium phrase" test
- [ ] Verify streaming works for longer text
- [ ] Click "Long phrase" test
- [ ] Verify no errors with long text
- [ ] Check browser console for errors
- [ ] Test interruption (if implemented)

## 🎯 Success Criteria

Your streaming TTS is working correctly if:

✅ **Time to first chunk: <1 second**
✅ **Multiple chunks received (3+)**
✅ **Audio starts playing quickly**
✅ **No errors in console**
✅ **Smooth playback**

## 📊 Compare: Streaming vs Non-Streaming

### **Test Both Methods**

1. **Test Streaming** (new):
   - Go to `/test-streaming`
   - Click a test phrase
   - Note the "Time to first audio"

2. **Test Non-Streaming** (old):
   - Go to voice settings
   - Test a Gemini voice
   - Note how long until audio starts

3. **Compare**:
   - Streaming should be 2-4x faster
   - Streaming should feel more responsive
   - Streaming should show progressive updates

## 🔧 Advanced Testing

### **Test with Custom Text**

Modify the test component to add your own phrases:

```typescript
const testPhrases = [
  "Your custom test phrase here",
  "Another test with different length",
  // Add more...
]
```

### **Measure Exact Latency**

Open browser DevTools:
1. Go to Network tab
2. Click a test phrase
3. Find the `/api/tts-stream` request
4. Check "Time" column for first byte time

### **Test Interruption**

1. Start a long phrase
2. Click "Stop" button
3. Verify streaming stops immediately
4. Check no errors in console

## 📈 Performance Benchmarks

### **Target Metrics**

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Time to first chunk | <500ms | <1000ms | >2000ms |
| Total chunks | 5-10 | 3-8 | 1-2 |
| Chunk size | ~5-10KB | ~10-20KB | >50KB |
| Total time | Same as non-streaming | +10% | +50% |

## ✅ Final Verification

After testing, you should be able to say:

- ✅ "Audio starts in less than 1 second"
- ✅ "I can see multiple chunks being received"
- ✅ "The experience feels much faster than before"
- ✅ "No errors appear during streaming"
- ✅ "Audio quality is good"

## 🚀 Next Steps

Once streaming works:

1. **Integrate into main app** - Replace non-streaming TTS
2. **Add to conversation mode** - Use for real-time chat
3. **Optimize chunk size** - Fine-tune for best performance
4. **Add interruption** - Allow stopping mid-stream
5. **Monitor metrics** - Track latency in production

---

**Ready to test?** Go to: http://127.0.0.1:3000/test-streaming 🎤
