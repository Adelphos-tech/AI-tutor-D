# 🚂 Railway Deployment Guide

## Quick Deploy to Railway

### 1. **Prepare Repository**
```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - AI Academic Tutor"

# Push to GitHub
git remote add origin https://github.com/yourusername/ai-academic-tutor.git
git push -u origin main
```

### 2. **Deploy to Railway**

1. **Go to [Railway.app](https://railway.app)**
2. **Click "Start a New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Choose your repository**
5. **Railway will auto-detect and deploy!**

### 3. **Configure Environment Variables**

In Railway dashboard, add these environment variables:

#### **Required API Keys**
```
DEEPGRAM_API_KEY=b25ae131afcc69d579e78effc9aefb1f29d11e56
GROQ_API_KEY=gsk_your_groq_api_key_here
PINECONE_API_KEY=pcsk_5Hz83L_2hw1whLPQyToaMHdSzoqHmBYY2ud2DpTP3fq89zZArfCxu8EuhA2VvKMDNBdH37
PINECONE_INDEX_NAME=new
```

#### **Database Configuration**
```
NODE_ENV=production
PORT=5001
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

#### **React App Variables**
```
REACT_APP_DEEPGRAM_API_KEY=b25ae131afcc69d579e78effc9aefb1f29d11e56
REACT_APP_API_URL=https://your-app-name.railway.app/api
```

### 4. **Add PostgreSQL Database**

1. **In Railway dashboard, click "New"**
2. **Select "Database" → "PostgreSQL"**
3. **Railway will automatically provide DATABASE_URL**
4. **Your app will connect automatically**

### 5. **Custom Domain (Optional)**

1. **In Railway dashboard, go to Settings**
2. **Click "Domains"**
3. **Add your custom domain**
4. **Update DNS records as instructed**

## 🎯 **Production Features**

### **What Works in Production**
- ✅ **Natural Voice Conversations** with Deepgram
- ✅ **AI Academic Tutoring** with Groq
- ✅ **Document Processing** with Pinecone
- ✅ **Real-time WebSocket** connections
- ✅ **PostgreSQL Database** for sessions
- ✅ **File Upload** and processing
- ✅ **Responsive UI** for all devices

### **Performance Optimizations**
- ✅ **Built React App** served statically
- ✅ **Compressed Assets** for fast loading
- ✅ **Database Connection Pooling**
- ✅ **Error Handling** and logging
- ✅ **Health Check** endpoint

## 🔧 **Troubleshooting**

### **Common Issues**

**Build Fails**
```bash
# Check if all dependencies are in package.json
npm run build
```

**Database Connection**
```bash
# Verify DATABASE_URL is set correctly
echo $DATABASE_URL
```

**API Keys**
```bash
# Ensure all API keys are set in Railway dashboard
# Check Environment Variables section
```

### **Logs and Debugging**
```bash
# View Railway logs
railway logs

# Check health endpoint
curl https://your-app.railway.app/api/health
```

## 🚀 **Go Live Checklist**

- [ ] Repository pushed to GitHub
- [ ] Railway project created and deployed
- [ ] PostgreSQL database added
- [ ] All environment variables configured
- [ ] Build successful (check Railway logs)
- [ ] Health check endpoint working
- [ ] Voice conversation tested
- [ ] Document upload tested
- [ ] Custom domain configured (optional)

## 📱 **Share Your App**

Once deployed, your AI Academic Tutor will be live at:
```
https://your-app-name.railway.app
```

**Features your users will have:**
- 🎙️ **Natural voice conversations** with Dr. Sarah Chen
- 📚 **Document-based tutoring** with AI
- 💬 **Real-time chat** and voice responses
- 📱 **Mobile-friendly** interface
- 🔒 **Secure** API key management

Ready to go live! 🎉
