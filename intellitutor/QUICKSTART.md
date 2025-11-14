# IntelliTutor - Quick Start Guide

Get IntelliTutor running in 5 minutes!

## ⚡ Quick Setup

### 1. Install Dependencies
```bash
cd intellitutor
npm install
```

### 2. Set Up Environment Variables
```bash
cp env.example .env
```

Edit `.env` and add your API keys:
- **GEMINI_API_KEY**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **PINECONE_API_KEY**: Get from [Pinecone](https://www.pinecone.io/)
- **DATABASE_URL**: Your PostgreSQL connection string

### 3. Set Up Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Create Pinecone Index
1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Create a new index:
   - **Name**: `intellitutor-vectors`
   - **Dimensions**: `768`
   - **Metric**: `cosine`

### 5. Run the App
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## 🎯 First Steps

1. **Upload a Textbook**
   - Click "Get Started Free" or go to `/library`
   - Click "Upload Textbook"
   - Drag and drop a PDF file
   - Wait 2-3 minutes for processing

2. **Explore Features**
   - View auto-generated summaries
   - Ask questions in the Q&A tab
   - Listen to content with TTS
   - Browse key concepts

## 🔑 Required API Keys

### Google Gemini API (Free Tier Available)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key to your `.env` file

### Pinecone (Free Tier: 1 index, 100K vectors)
1. Sign up at [Pinecone](https://www.pinecone.io/)
2. Create a project
3. Create an index (settings above)
4. Copy API key and environment to `.env`

### PostgreSQL Database

**Option 1: Local (Free)**
```bash
# Install PostgreSQL
brew install postgresql  # macOS
# or download from postgresql.org

# Start PostgreSQL
brew services start postgresql

# Create database
createdb intellitutor

# Update .env
DATABASE_URL="postgresql://localhost:5432/intellitutor"
```

**Option 2: Cloud (Free Tier)**
- [Neon](https://neon.tech/) - Generous free tier
- [Supabase](https://supabase.com/) - Free tier with 500MB
- [Railway](https://railway.app/) - Free tier available

## 🐛 Common Issues

### "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### "ENOENT: no such file or directory, open 'uploads/...'"
```bash
mkdir uploads
```

### "Invalid API key" errors
- Double-check your `.env` file
- Ensure no extra spaces or quotes
- Restart the dev server after changes

### File upload fails
- Check file size (max 200MB)
- Ensure file type is PDF, DOCX, TXT, or EPUB
- Check console for detailed errors

## 📚 Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check the [PRD](../IntelliTutor_PRD.md) for product requirements
- Explore the codebase in `src/`

## 💡 Tips

- Start with a small PDF (10-20 pages) for faster testing
- Use Prisma Studio to view database: `npx prisma studio`
- Check API usage in Gemini and Pinecone dashboards
- Enable debug logging: `DEBUG=* npm run dev`

## 🆘 Need Help?

- Check the troubleshooting section in [README.md](./README.md)
- Review error messages in the browser console
- Check server logs in the terminal
- Verify all environment variables are set correctly

---

**Happy Learning! 🚀**
