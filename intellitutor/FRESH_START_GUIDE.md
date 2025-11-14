# Fresh Start - Complete Reset Guide

## 🔴 **THE PROBLEM**

You keep viewing **OLD failed uploads** that were created BEFORE:
- The new logging code
- The local embeddings
- The error handling fixes

**These old materials will NEVER work. You must delete them and start fresh.**

## ✅ **SOLUTION: Complete Fresh Start**

### **Step 1: Delete ALL Old Materials**

Go to http://127.0.0.1:3000/library and delete EVERY material you see.

**Why?** All existing materials:
- Were uploaded with old code
- Failed due to old bugs
- Have no logging
- Cannot be fixed

### **Step 2: Clear Uploads Folder**

```bash
cd /Users/shivang/Desktop/Adelphos\ ai\ tutor/intellitutor
rm -rf uploads/*
```

### **Step 3: Verify Pinecone Configuration**

Check your `.env` file:

```bash
cat .env | grep PINECONE
```

Should show:
```
PINECONE_API_KEY="your_key_here"
PINECONE_ENVIRONMENT="us-east-1-aws"
PINECONE_INDEX_NAME="document-knowledge-base"
```

### **Step 4: Create Pinecone Index**

**CRITICAL:** The index MUST exist with correct dimensions!

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Check if index `document-knowledge-base` exists
3. If it exists, check dimensions:
   - If 768D → **DELETE IT** (wrong dimension)
   - If 384D → **KEEP IT** (correct)
4. If doesn't exist, create new:
   ```
   Name: document-knowledge-base
   Dimensions: 384
   Metric: cosine
   Cloud: AWS
   Region: us-east-1
   ```

### **Step 5: Restart Server**

```bash
# Kill current server
pkill -f "next dev"

# Start fresh
cd /Users/shivang/Desktop/Adelphos\ ai\ tutor/intellitutor
npm run dev
```

### **Step 6: Upload ONE Small Test File**

1. Create a simple test file:
   ```bash
   echo "This is a test document about artificial intelligence.

   Chapter 1: Introduction
   Artificial Intelligence (AI) is the simulation of human intelligence processes by machines, especially computer systems.

   Chapter 2: Applications
   AI is used in various fields including healthcare, finance, and education." > test-document.txt
   ```

2. Go to http://127.0.0.1:3000/library/upload

3. Upload `test-document.txt`

4. **IMMEDIATELY watch the server terminal**

### **Step 7: Check Server Logs**

You should see:

```
📤 ========== UPLOAD REQUEST RECEIVED ==========
📄 File received: test-document.txt, Size: XXX bytes
🚀 Triggering async processing for material cmh...
📄 Starting processing for material cmh...
📝 Step 1: Extracting text from uploads/...
✅ Text extracted: XXX characters, 1 pages
📚 Step 2: Detecting chapters
✅ Detected 2 chapters
🔄 Step 3: Processing 2 chapters
  Processing Chapter 1: Introduction
🔄 Generating 5 embeddings locally...
✅ Generated 5 embeddings (384D)
✅ ✅ ✅ Material processed successfully!
```

**OR if it fails:**

```
📤 UPLOAD REQUEST RECEIVED
❌ ASYNC PROCESSING FAILED: [exact error message]
Error stack: [details]
```

## 🐛 **If You Still See "Processing Failed"**

### **Scenario A: No Logs at All**

**Problem**: Server didn't restart or upload route not recompiled

**Solution**:
```bash
pkill -f "next dev"
rm -rf .next
npm run dev
```

### **Scenario B: "Pinecone not configured"**

**Problem**: Index doesn't exist or wrong name

**Solution**:
1. Check Pinecone Console
2. Verify index name matches `.env`
3. Verify dimensions = 384

### **Scenario C: "Model not found" or "Embedding error"**

**Problem**: Transformers.js model not downloaded

**Solution**: Wait for first download (one-time, ~50MB)

### **Scenario D: Server Crashes**

**Problem**: Memory issue or dependency missing

**Solution**:
```bash
npm install @xenova/transformers mammoth
npm run dev
```

## 📊 **Verification Checklist**

Before uploading:

- [ ] All old materials deleted from /library
- [ ] Uploads folder cleared
- [ ] Pinecone index exists (384D)
- [ ] `.env` has correct PINECONE_INDEX_NAME
- [ ] Server restarted fresh
- [ ] Dependencies installed (@xenova/transformers, mammoth)

After uploading:

- [ ] Server logs show "📤 UPLOAD REQUEST RECEIVED"
- [ ] Server logs show "🚀 Triggering async processing"
- [ ] Server logs show "📄 Starting processing"
- [ ] Either success (✅ ✅ ✅) or error (❌) appears
- [ ] Material status changes from PROCESSING to READY or ERROR

## 🎯 **Expected Timeline**

```
0s   - Upload file
1s   - "📤 UPLOAD REQUEST RECEIVED"
2s   - "📄 Starting processing"
3s   - "📝 Extracting text"
5s   - "📚 Detecting chapters"
10s  - "🔄 Generating embeddings"
15s  - "✅ ✅ ✅ Material processed successfully!"
```

For a small test file (< 1 page), entire process should take **< 20 seconds**.

## ❌ **Common Mistakes**

1. ❌ **Viewing old materials** - These will NEVER work, delete them!
2. ❌ **Not watching server logs** - You need to see what's happening
3. ❌ **Wrong Pinecone dimension** - Must be 384D, not 768D
4. ❌ **Index doesn't exist** - Create it first!
5. ❌ **Not restarting server** - New code won't load
6. ❌ **Uploading large files first** - Start with tiny test file

## ✅ **Success Criteria**

You'll know it works when:

1. ✅ Server logs show detailed progress
2. ✅ Material status changes to READY
3. ✅ Pinecone Console shows new vectors
4. ✅ Q&A returns relevant answers
5. ✅ No "Processing failed" message

## 🚀 **Quick Start Commands**

```bash
# 1. Clean everything
cd /Users/shivang/Desktop/Adelphos\ ai\ tutor/intellitutor
rm -rf uploads/*
pkill -f "next dev"

# 2. Verify config
cat .env | grep PINECONE

# 3. Start server
npm run dev

# 4. Create test file
echo "Test document with AI content" > test.txt

# 5. Upload test.txt at http://127.0.0.1:3000/library/upload

# 6. Watch terminal for logs
```

## 📞 **If Still Failing**

Share these with me:

1. **Server logs** (copy from terminal)
2. **Pinecone Console** (screenshot showing index)
3. **`.env` file** (PINECONE lines only)
4. **Material ID** (from URL)

**DO NOT view old materials - they are useless. Upload a NEW file!** 🎯
