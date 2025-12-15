# 🚂 Railway Environment Variables - Troubleshooting Guide

## ⚠️ Important: React Environment Variables

React apps require special handling for environment variables:

### ✅ Key Requirements:

1. **Variable Name MUST start with `REACT_APP_`**
   - ✅ Correct: `REACT_APP_DEEPGRAM_API_KEY`
   - ❌ Wrong: `DEEPGRAM_API_KEY`
   
2. **Variables are baked into the build at BUILD TIME**
   - Adding a variable AFTER deployment requires a **REBUILD**
   - Variables are NOT available at runtime - they're hardcoded into the JS bundle
   
3. **Must be set BEFORE the build runs**
   - Railway needs to rebuild after adding the variable

---

## 🔍 Check Your Railway Setup

### Step 1: Verify Variable Name

In Railway Dashboard:
1. Go to your project → Variables tab
2. Look for: `REACT_APP_DEEPGRAM_API_KEY`
3. **Check the exact spelling** - it's case-sensitive!

Common mistakes:
- ❌ `DEEPGRAM_API_KEY` (missing REACT_APP_ prefix)
- ❌ `REACT_APP_DEEPGRAM_KEY` (wrong name)
- ❌ `React_App_Deepgram_Api_Key` (wrong case)
- ✅ `REACT_APP_DEEPGRAM_API_KEY` (correct!)

### Step 2: Check When Variable Was Added

If you added the variable recently:
- Did Railway automatically trigger a rebuild?
- If not, manually trigger a redeploy

**To manually redeploy:**
1. Go to your service in Railway
2. Click the "..." menu on the latest deployment
3. Click "Redeploy"

### Step 3: Verify in Build Logs

In Railway deployment logs, search for:
- `REACT_APP_DEEPGRAM_API_KEY` should appear during build
- Should NOT show as "undefined"

---

## 🔧 Quick Fix Options

### Option 1: Force Rebuild (Recommended)

```bash
# In your local terminal
git commit --allow-empty -m "Force Railway rebuild"
git push origin main
```

This will trigger a fresh build with the environment variables.

### Option 2: Check Railway Variables

Run this command to see all variables (Railway CLI):
```bash
railway variables
```

Look for `REACT_APP_DEEPGRAM_API_KEY` in the output.

### Option 3: Test Locally First

```bash
# In client directory
export REACT_APP_DEEPGRAM_API_KEY="your_key_here"
npm run build
npm start
```

If it works locally, it's definitely a Railway configuration issue.

---

## 🐛 Debug Information Added

I've added logging to the code that will show in the browser console:

```javascript
🔑 API Key check: {
  exists: true/false,
  length: 40,
  firstChars: "abc12345..."
}
```

### How to Check:

1. Go to voice session page
2. Open browser console (F12)
3. Click "Start Voice Conversation"
4. Look for "🔑 API Key check" log
5. Check if `exists: false` → Variable is NOT being loaded

---

## 📋 Complete Railway Variable List

Your Railway environment should have:

### Frontend Variables (REACT_APP_):
```
REACT_APP_API_URL=https://ai-tutor-d-production.up.railway.app/api
REACT_APP_DEEPGRAM_API_KEY=<your_deepgram_key>
```

### Build Variables:
```
CI=false
GENERATE_SOURCEMAP=false
ESLINT_NO_DEV_ERRORS=true
```

### Backend Variables (if separate):
```
DEEPGRAM_API_KEY=<your_deepgram_key>
DATABASE_URL=<postgres_url>
PINECONE_API_KEY=<pinecone_key>
... other backend vars ...
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "API key not found" but variable exists in Railway

**Cause:** Variable added after last build  
**Solution:** 
```bash
# Force rebuild
git commit --allow-empty -m "Rebuild with env vars"
git push
```

### Issue 2: Variable exists but shows as "undefined" in logs

**Cause:** Variable name doesn't match or missing `REACT_APP_` prefix  
**Solution:** 
- Rename variable to exactly: `REACT_APP_DEEPGRAM_API_KEY`
- Redeploy

### Issue 3: Works locally but not on Railway

**Cause:** Different environment variable sources  
**Solution:**
- Ensure `.env.production` doesn't override Railway vars
- Check Railway build logs for warnings

### Issue 4: "Invalid API key" error from Deepgram

**Cause:** API key is wrong, expired, or has no credits  
**Solution:**
- Verify key in Deepgram console
- Check API key has credits/quota
- Generate new key if needed

---

## ✅ Verification Steps

After fixing:

1. **Check Railway Logs:**
   ```
   ✓ Building with: REACT_APP_DEEPGRAM_API_KEY=abc...
   ✓ Build successful
   ✓ Deploying...
   ```

2. **Check Browser Console:**
   ```
   🔑 API Key check: { exists: true, length: 40, firstChars: "abc12345..." }
   ✅ Deepgram connection opened
   ```

3. **Test Voice Session:**
   - Should connect without errors
   - Microphone should activate
   - Speech should be transcribed

---

## 📞 Next Steps

1. **Open Railway dashboard** → Check variable name
2. **If variable is correct** → Trigger manual redeploy
3. **Check browser console** → Look for API key debug logs
4. **Share console output** → If still not working

The issue is most likely:
- ❌ Variable name mismatch
- ❌ Variable added but no rebuild triggered
- ❌ API key is invalid

Once Railway has the correct variable and rebuilds, it will work! 🚀
