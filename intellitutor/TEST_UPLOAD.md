# Upload System Test Plan

## 🧪 Current Status

**File uploaded**: ✅ htmlCode.pdf (223 KB)
**Material ID**: cmhtglozw0005scn7d9d91r85
**Status**: ERROR (Processing failed)
**Issue**: Background processing not running

## 🔍 What I Just Fixed

Added detailed logging to track:
1. ✅ When async processing is triggered
2. ✅ If processing function starts
3. ✅ Where exactly it fails
4. ✅ Full error stack trace

## 📊 Expected Logs (After Fix)

When you upload a file, you should now see:

```
🚀 Triggering async processing for material cmhtglozw...
📄 Starting processing for material cmhtglozw...
📝 Step 1: Extracting text from uploads/...
✅ Text extracted: XXXX characters, Y pages
📚 Step 2: Detecting chapters
✅ Detected N chapters
🔄 Step 3: Processing N chapters
  Processing Chapter 1: Title
  ...
✅ ✅ ✅ Material processed successfully!
```

OR if it fails:

```
🚀 Triggering async processing for material cmhtglozw...
📄 Starting processing for material cmhtglozw...
❌ ASYNC PROCESSING FAILED: [error message]
Error stack: [full stack trace]
```

## 🎯 Next Steps

### **Step 1: Delete Failed Materials**
1. Go to http://127.0.0.1:3000/library
2. Delete all materials with ERROR status
3. Start with a clean slate

### **Step 2: Upload Test File**
1. Go to http://127.0.0.1:3000/library/upload
2. Upload a SMALL PDF (< 5 pages, < 1 MB)
3. Watch the server terminal

### **Step 3: Check Logs**
Look for these specific logs:
- `🚀 Triggering async processing` - Confirms upload succeeded
- `📄 Starting processing` - Confirms async function started
- `❌ ASYNC PROCESSING FAILED` - Shows exact error

### **Step 4: Report Results**
Share the logs you see, especially any error messages

## 🔧 Possible Issues & Solutions

### **Issue 1: No logs at all**
**Cause**: Server not restarted after code changes
**Solution**: Restart server (Ctrl+C, then `npm run dev`)

### **Issue 2: "pdf-parse" error**
**Cause**: Module loading issue
**Solution**: Already fixed with dynamic import

### **Issue 3: "Pinecone" error**
**Cause**: Index doesn't exist
**Solution**: Create index or skip (already handles gracefully)

### **Issue 4: "Gemini API" error**
**Cause**: Quota exceeded
**Solution**: Uses fallback summaries (already implemented)

### **Issue 5: "Database" error**
**Cause**: Connection issue
**Solution**: Check DATABASE_URL in .env

## 📝 Quick Test Commands

```bash
# Check if file was uploaded
ls -lh uploads/ | tail -5

# Check server is running
curl http://127.0.0.1:3000/api/materials

# Watch logs in real-time
# (Just keep terminal visible while uploading)
```

## ✅ What Should Work Now

After the fixes:
1. ✅ Upload succeeds (file saved)
2. ✅ Material created in database
3. ✅ Async processing triggered
4. ✅ Detailed logs show progress
5. ✅ Errors are caught and logged
6. ✅ You can see exactly what fails

## 🎯 Action Items

1. **Restart server** (to load new logging code)
2. **Delete failed materials** (clean slate)
3. **Upload small test file** (< 5 pages)
4. **Watch terminal logs** (you'll see detailed progress)
5. **Share error logs** (if it still fails)

**The logging is now comprehensive - you'll see exactly where it fails!** 🔍
