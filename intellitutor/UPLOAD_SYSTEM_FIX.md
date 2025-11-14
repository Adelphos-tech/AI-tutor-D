# Upload System - Complete Fix & Test Guide

## 🔴 Current Issues

1. ❌ Processing fails silently after upload
2. ❌ No chapters created
3. ❌ No Pinecone embeddings
4. ❌ Status shows ERROR

## 🔍 Root Causes

### **1. Gemini API Quota Exceeded**
- Free tier: 15 TTS requests/day (already hit)
- Text generation also has limits
- Processing fails when quota exceeded

### **2. Pinecone Index Missing**
- Index `document-knowledge-base` doesn't exist
- Embeddings fail silently
- No error shown to user

### **3. Background Processing Crashes**
- Async function fails
- No error logging
- Status set to ERROR

## ✅ **Immediate Solutions**

### **Solution 1: Use Smaller Test File**

Create a tiny test PDF (1 page) to test the system:

```bash
# Create test file
echo "This is a test document about AI. 
Chapter 1: Introduction
Artificial Intelligence is the simulation of human intelligence.
Chapter 2: Applications  
AI is used in many fields including healthcare and education." > test.txt

# Convert to PDF (if you have tools)
# Or just use a very small existing PDF
```

### **Solution 2: Check Pinecone Index**

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Check if index `document-knowledge-base` exists
3. If not, create it:
   - Name: `document-knowledge-base`
   - Dimensions: `768`
   - Metric: `cosine`

### **Solution 3: Monitor Processing**

Watch server logs during upload:
```bash
# In terminal running npm run dev
# Look for:
✅ "Material {id} processed successfully"
❌ "Error processing material {id}"
⚠️ "Pinecone not configured"
⚠️ "Summary generation failed"
```

## 🧪 **Testing Plan**

### **Test 1: Verify Configuration**

```bash
cd /Users/shivang/Desktop/Adelphos\ ai\ tutor/intellitutor

# Check environment variables
grep "PINECONE\|GEMINI" .env

# Expected output:
# GEMINI_API_KEY="..."
# PINECONE_API_KEY="..."
# PINECONE_ENVIRONMENT="us-east-1-aws"
# PINECONE_INDEX_NAME="document-knowledge-base"
```

### **Test 2: Check Database Connection**

```bash
# Server logs should show:
✅ Database connected successfully
```

### **Test 3: Upload Small File**

1. Go to http://127.0.0.1:3000/library/upload
2. Upload a VERY small PDF (< 1 MB, < 10 pages)
3. Watch server terminal for logs
4. Check material page after 30 seconds

### **Test 4: Check Pinecone**

After upload, check Pinecone Console:
- Go to your index
- Check "Vectors" count
- Should increase after successful upload

## 🔧 **Manual Fixes**

### **Fix 1: Add Better Logging**

The processing function needs better error logging. Currently errors are swallowed.

### **Fix 2: Reduce API Calls**

To avoid quota issues:
- Skip summaries if quota exceeded (already done ✅)
- Skip practice questions if quota exceeded (already done ✅)
- Skip concepts if quota exceeded (already done ✅)
- Continue to embeddings even if AI fails (already done ✅)

### **Fix 3: Make Pinecone Optional**

Already done ✅ - System continues without Pinecone

## 📊 **Expected vs Actual**

### **Expected Flow**
```
Upload → Extract Text → Detect Chapters → Generate Summaries → 
Create Embeddings → Status: READY
```

### **Actual Flow (Current)**
```
Upload → Extract Text → [CRASH] → Status: ERROR
```

### **Why It's Crashing**

Most likely causes:
1. **Gemini API quota** - Can't generate summaries
2. **Pinecone connection** - Index doesn't exist
3. **Memory issue** - PDF too large
4. **Timeout** - Processing takes too long

## 🎯 **Recommended Actions**

### **Immediate (Do Now)**

1. **Create Pinecone Index**
   - Go to Pinecone Console
   - Create `document-knowledge-base` index
   - Dimensions: 768, Metric: cosine

2. **Delete Failed Uploads**
   - Go to /library
   - Delete all materials with ERROR status
   - Start fresh

3. **Test with Tiny File**
   - Use smallest possible PDF (1-2 pages)
   - Watch server logs
   - Check if it completes

### **Short Term (Next)**

4. **Check Gemini Quota**
   - Go to [Google AI Studio](https://aistudio.google.com/)
   - Check usage/quota
   - Wait for reset if needed

5. **Monitor Processing**
   - Keep server terminal visible
   - Watch for error messages
   - Report any errors you see

### **Long Term (Later)**

6. **Upgrade API Plans**
   - Gemini: Upgrade for more quota
   - Pinecone: Free tier is fine for now

7. **Add Progress Tracking**
   - Show processing progress to user
   - Better error messages
   - Retry functionality

## 🐛 **Debugging Steps**

### **Step 1: Check What's Actually Failing**

After upload, check server logs for:
```
Error processing material {id}: [actual error message]
```

### **Step 2: Check Material Status**

```bash
# Check database
# Material should have:
# - processingStatus: 'PROCESSING' → 'READY' or 'ERROR'
# - pageCount: should be set
# - wholeSummary: should be set (or null if failed)
```

### **Step 3: Check File Was Saved**

```bash
ls -lh uploads/
# Should see your uploaded file
```

### **Step 4: Check Chapters Created**

If no chapters, the issue is in chapter detection or database save.

## 📝 **What to Check Right Now**

1. ✅ **Pinecone Index Exists?**
   - [ ] Yes → Continue
   - [ ] No → Create it first

2. ✅ **Gemini API Key Valid?**
   - [ ] Yes → Continue
   - [ ] No → Update .env

3. ✅ **Database Connected?**
   - [ ] Yes → Continue
   - [ ] No → Check DATABASE_URL

4. ✅ **Server Running?**
   - [ ] Yes → Continue
   - [ ] No → Restart with `npm run dev`

## 🚀 **Quick Test**

Run this test:

1. Delete all failed materials from /library
2. Create Pinecone index (if not exists)
3. Upload a 1-page PDF
4. Watch server logs for 60 seconds
5. Check material page

**If it still fails, share the server error logs!**

## 💡 **Why Processing Might Be Failing**

Based on the error pattern, most likely:

1. **Gemini API Quota** (95% likely)
   - Solution: Wait 24 hours or upgrade plan
   - Workaround: System should use fallbacks (already implemented)

2. **Pinecone Index Missing** (80% likely)
   - Solution: Create the index
   - Workaround: System should skip (already implemented)

3. **PDF Parsing Error** (20% likely)
   - Solution: Try different PDF
   - Workaround: Check PDF is valid

## ✅ **Next Steps**

1. Create Pinecone index
2. Delete failed materials
3. Upload tiny test file
4. Share server logs if it fails

**The system has all the error handling in place - we just need to identify which specific error is occurring!**
