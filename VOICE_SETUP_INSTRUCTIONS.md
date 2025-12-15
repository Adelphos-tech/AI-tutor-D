# 🎤 Voice Session Setup Instructions

## ⚠️ Current Issue: Connection Error

The voice session is failing because the **Deepgram API key is not configured** in the production environment.

### Error Message:
```
❌ Connection error - Retrying...
Connection failed. Please check your microphone permissions and try again.
```

### Root Cause:
The `REACT_APP_DEEPGRAM_API_KEY` environment variable is missing from Railway.

---

## 🔧 How to Fix

### Step 1: Get Your Deepgram API Key
1. Go to https://console.deepgram.com/
2. Sign in or create an account
3. Navigate to **API Keys** section
4. Copy your API key (it looks like: `a1b2c3d4e5f6...`)

### Step 2: Add to Railway Environment Variables

#### Option A: Via Railway Dashboard (Recommended)
1. Go to https://railway.app/dashboard
2. Select your project: **AI-tutor-D**
3. Click on your service (the main app)
4. Go to **Variables** tab
5. Click **+ New Variable**
6. Add:
   - **Variable Name**: `REACT_APP_DEEPGRAM_API_KEY`
   - **Value**: Your Deepgram API key
7. Click **Add** and wait for auto-redeploy

#### Option B: Via Railway CLI
```bash
railway variables set REACT_APP_DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### Step 3: Verify Deployment
1. Wait 2-3 minutes for Railway to rebuild and deploy
2. Go to: https://ai-tutor-d-production.up.railway.app/voice/61
3. Click **"Start Voice Conversation"**
4. Should now connect successfully! ✅

---

## 🛠️ Improvements Made in Code

### 1. Better Error Detection
- Added validation for missing/invalid API key
- Shows specific error messages for different failure types

### 2. Enhanced Error Messages
- **API Key Missing**: Shows "Configuration error: Deepgram API key is missing. Please contact support."
- **Microphone Denied**: Shows helpful instructions on how to enable microphone access
- **Other Errors**: Shows specific error message from the service

### 3. Improved UI Feedback
- Dynamic error messages based on actual error type
- Step-by-step instructions for microphone permission issues
- Clear visual distinction between configuration vs. user errors

---

## 📋 Checklist

Before voice session will work, ensure:

- [ ] Deepgram account created
- [ ] API key obtained from Deepgram console
- [ ] `REACT_APP_DEEPGRAM_API_KEY` added to Railway variables
- [ ] Railway service redeployed (automatic after adding variable)
- [ ] Browser has microphone permission granted
- [ ] HTTPS connection (required for microphone access)

---

## 🎯 Expected Behavior After Fix

1. **User clicks "Start Voice Conversation"**
   - ✅ Shows: "🔄 Connecting to voice conversation..."
   
2. **Browser requests microphone permission**
   - ✅ User grants permission
   
3. **Connection establishes**
   - ✅ Shows: "✅ Connected - Natural conversation ready"
   - ✅ Shows: "🎧 Listening - Speak naturally"
   
4. **User speaks**
   - ✅ Live transcript appears
   - ✅ AI processes and responds with voice

---

## 🔍 Testing After Setup

### Test 1: Basic Connection
```
1. Go to voice session page
2. Click "Start Voice Conversation"
3. Check browser console for logs
4. Should see: "✅ Deepgram connection opened"
```

### Test 2: Voice Recognition
```
1. Say: "Hello, can you hear me?"
2. Should see live transcript appearing
3. Should hear AI voice response
```

### Test 3: Multi-turn Conversation
```
1. Ask: "What is this document about?"
2. Wait for response
3. Follow up: "Can you explain that in more detail?"
4. Both exchanges should work smoothly
```

---

## 🐛 Troubleshooting

### Issue: Still shows "API key missing" error
**Solution**: 
- Verify the variable name is exactly: `REACT_APP_DEEPGRAM_API_KEY`
- Check the API key has no extra spaces or quotes
- Force redeploy in Railway dashboard

### Issue: "Microphone permission denied"
**Solution**:
- Click the camera/microphone icon in browser address bar
- Select "Always allow" for microphone
- Refresh the page

### Issue: Connected but no audio heard
**Solution**:
- Check browser audio is not muted
- Check system volume settings
- Try different browser (Chrome/Edge recommended)

---

## 📞 Support

If issues persist after following these steps:
1. Check browser console for detailed error logs
2. Share screenshots of the error
3. Verify Deepgram API key is valid and has credits
4. Test in incognito/private mode to rule out extensions

---

## ✅ Summary

The voice feature requires a Deepgram API key to function. Once you add `REACT_APP_DEEPGRAM_API_KEY` to your Railway environment variables, the voice conversation will work perfectly!
