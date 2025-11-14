# ⚡ Quick Test Guide - IntelliTutor

## 🎯 5-Minute Smoke Test

### **Test 1: Upload (2 min)**
```bash
1. Go to /library/upload
2. Drop a PDF file
3. Click "Upload and Process"
4. ✅ Progress bar works
5. ✅ Redirects to material page
```

### **Test 2: Voice Teacher (2 min)**
```bash
1. Go to any material
2. Click "Voice Teacher" tab
3. Click "Start Teaching Session"
4. Allow microphone
5. Say: "What is this about?"
6. ✅ Hears question
7. ✅ Responds with voice
8. ✅ Continues conversation
```

### **Test 3: Chat (1 min)**
```bash
1. Go to "Chat" tab
2. Type: "Summarize this"
3. ✅ Response appears
4. ✅ Citations shown
```

---

## 🐛 Critical Bug Tests

### **Test 1: Memory Leak (Voice)**
```bash
1. Start voice session
2. Ask 10 questions
3. Stop session
4. Navigate away
5. Check browser memory
6. ✅ Memory released
```

### **Test 2: Race Condition (Upload)**
```bash
1. Start upload
2. Immediately click cancel
3. Start new upload
4. ✅ No errors
5. ✅ Clean state
```

### **Test 3: Error Recovery (Chat)**
```bash
1. Disconnect internet
2. Ask question
3. ✅ Error shown
4. Reconnect
5. Retry
6. ✅ Works
```

---

## 🎯 Edge Case Tests

### **Test 1: Empty File**
```bash
1. Create 0-byte file
2. Try to upload
3. ✅ Error: "File is empty"
```

### **Test 2: No Speech**
```bash
1. Start voice session
2. Stay silent for 30s
3. ✅ Timeout message
4. ✅ Prompts to retry
```

### **Test 3: Rate Limit**
```bash
1. Ask 20 questions rapidly
2. ✅ Rate limit error
3. ✅ Retry timer shown
4. Wait 10s
5. ✅ Works again
```

---

## ✅ Quick Checklist

### **Before Every Deployment:**
- [ ] Upload works
- [ ] Voice works
- [ ] Chat works
- [ ] No console errors
- [ ] No memory leaks
- [ ] Error messages clear
- [ ] Cancel buttons work
- [ ] Retry works

---

## 🚨 Red Flags to Watch For

### **Console Errors:**
- ❌ "Memory leak detected"
- ❌ "Failed to fetch"
- ❌ "Uncaught TypeError"
- ❌ "Cannot read property of undefined"

### **UI Issues:**
- ❌ Buttons don't respond
- ❌ Progress bar stuck
- ❌ Audio doesn't play
- ❌ Microphone doesn't work

### **Performance:**
- ❌ Page takes >3s to load
- ❌ Chat response >5s
- ❌ Voice delay >2s
- ❌ Memory keeps growing

---

## 📊 Success Metrics

### **Upload:**
- ✅ <2s to start
- ✅ Progress updates smooth
- ✅ Completes in <5min
- ✅ Redirects correctly

### **Voice:**
- ✅ Microphone works first try
- ✅ Transcription accurate
- ✅ Response in <3s
- ✅ Audio plays clearly

### **Chat:**
- ✅ Response in <2s
- ✅ Citations accurate
- ✅ Markdown renders
- ✅ Scrolling smooth

---

## 🎉 All Green? Ship It! 🚀
