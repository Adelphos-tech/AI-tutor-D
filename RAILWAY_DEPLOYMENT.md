# Railway Deployment Guide for AI-tutor-D

## Quick Fix for Current Error

In your Railway dashboard for the **AI-tutor-D** project:

1. Go to **Settings** tab
2. Under **Root Directory**, enter: `intellitutor`
3. Save and redeploy

## Complete Deployment Setup

This project requires **TWO separate Railway services**:

### Service 1: Frontend (Next.js)

#### Settings:
- **Root Directory:** `intellitutor`
- **Build Command:** (auto-detected)
- **Start Command:** `npm start`

#### Required Environment Variables:
```env
# Database (use Railway PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_SPEECH_MODEL=gemini-2.5-flash-preview-tts

# Pinecone (use the provided key from memory)
PINECONE_API_KEY=pcsk_65GWz3_GUoKLuRJcEqDWa1qAFkaNm3q7bGrTktvRruTqkWdC4j9J6f32wwVmNrejJmuYZG
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=intellitutor-vectors

# NextAuth (generate random secret: openssl rand -base64 32)
NEXTAUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
NEXTAUTH_SECRET=generate_random_secret_here

# File Upload
MAX_FILE_SIZE=209715200
UPLOAD_DIR=./uploads
```

### Service 2: Backend (FastAPI Voice)

#### Settings:
- **Root Directory:** `voice-backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

#### Required Environment Variables:
```env
# Deepgram API
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# CORS (use frontend URL)
CORS_ORIGINS=https://${{Frontend.RAILWAY_PUBLIC_DOMAIN}}
```

## Step-by-Step Deployment

### 1. Create PostgreSQL Database
1. In Railway dashboard, click **+ New**
2. Select **Database** → **PostgreSQL**
3. Wait for provisioning

### 2. Deploy Frontend
1. Click **+ New** → **GitHub Repo**
2. Select `Adelphos-tech/AI-tutor-D`
3. In Settings:
   - Set **Root Directory** to `intellitutor`
4. In Variables tab:
   - Add all frontend environment variables listed above
   - For `DATABASE_URL`, reference the Postgres service: `${{Postgres.DATABASE_URL}}`
5. Deploy

### 3. Setup Database Schema
After frontend deploys, run these commands in Railway terminal:
```bash
npx prisma generate
npx prisma db push
```

### 4. Deploy Backend
1. Click **+ New** → **GitHub Repo**
2. Select `Adelphos-tech/AI-tutor-D` again
3. In Settings:
   - Set **Root Directory** to `voice-backend`
4. In Variables tab:
   - Add all backend environment variables listed above
5. Deploy

### 5. Connect Frontend to Backend
In frontend environment variables, add:
```env
NEXT_PUBLIC_VOICE_BACKEND_URL=wss://${{VoiceBackend.RAILWAY_PUBLIC_DOMAIN}}/ws
```

## Testing Deployment

1. **Frontend:** Open the public URL from Railway
2. **Backend Health:** Visit `https://[backend-url]/health`
3. **WebSocket:** Test voice connection from frontend

## Troubleshooting

### Build Failed Error
- Check Root Directory is set correctly
- Verify all required env variables are present

### Database Connection Error
- Ensure DATABASE_URL uses the Railway Postgres reference
- Run `npx prisma generate && npx prisma db push`

### Voice Backend Connection Failed
- Check DEEPGRAM_API_KEY and GEMINI_API_KEY are valid
- Verify CORS_ORIGINS includes frontend URL
- Ensure WebSocket is enabled (Railway supports it by default)

### File Upload Issues
- Railway has ephemeral filesystem, consider using S3 for production
- Set AWS environment variables if using S3

## Production Checklist

- [ ] PostgreSQL database created and connected
- [ ] Pinecone index created (768 dimensions, cosine metric)
- [ ] All API keys added to environment variables
- [ ] NEXTAUTH_SECRET generated and set
- [ ] Database schema migrated
- [ ] Frontend deployed and accessible
- [ ] Backend deployed and health check passes
- [ ] WebSocket connection working
- [ ] File uploads tested
- [ ] Consider S3 for file storage (optional)

## API Keys Needed

1. **Gemini API Key** - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Deepgram API Key** - Get from [Deepgram Console](https://console.deepgram.com/)
3. **Pinecone API Key** - Already provided in memory
4. **AWS Keys** (optional) - For S3 file storage

## Generate NEXTAUTH_SECRET

Run locally:
```bash
openssl rand -base64 32
```

Or use: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
