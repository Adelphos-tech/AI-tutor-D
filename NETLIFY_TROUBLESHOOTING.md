# Netlify Deployment Troubleshooting Guide

## Current Issue: Site Returns "Not Found"

Your Netlify site at `https://aitutord.netlify.app/` is returning a "Not Found" error. Here are the most likely causes and solutions:

---

## 🔍 **Diagnosis Steps**

### 1. Check Netlify Build Logs
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Find your `aitutord` site
3. Click on "Deploys" tab
4. Check the latest deploy status and logs

**Look for these common errors:**
- Build command failed
- Missing dependencies
- TypeScript compilation errors
- Environment variable issues

---

## 🛠️ **Common Fixes**

### Fix 1: Install Missing Dependencies

The site needs the Netlify Next.js plugin:

```bash
cd intellitutor
npm install --save-dev @netlify/plugin-nextjs@^5.7.2
```

### Fix 2: Set Environment Variables in Netlify

Go to Netlify Dashboard → Site Settings → Environment Variables and add:

```env
# Required for build
NODE_VERSION=20.18.0
DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy

# Required for runtime (get these from your accounts)
GEMINI_API_KEY=your_gemini_api_key_here
PINECONE_API_KEY=pcsk_65GWz3_GUoKLuRJcEqDWa1qAFkaNm3q7bGrTktvRruTqkWdC4j9J6f32wwVmNrejJmuYZG
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=document-knowledge-base

# NextAuth (generate secret)
NEXTAUTH_URL=https://aitutord.netlify.app
NEXTAUTH_SECRET=your_secret_here

# Optional
MAX_FILE_SIZE=6291456
```

### Fix 3: Update Build Settings in Netlify

In Netlify Dashboard → Site Settings → Build & Deploy:

- **Build command:** `npm run build`
- **Publish directory:** Leave empty (plugin handles this)
- **Node version:** `20.18.0`

### Fix 4: Check Repository Connection

Ensure Netlify is connected to the correct repository and branch:
- Repository: `Adelphos-tech/AI-tutor-D`
- Branch: `main`
- Base directory: `intellitutor`

---

## 🚨 **Known Limitations on Netlify**

This Next.js app uses server-side features that have limitations on Netlify:

| Feature | Railway ✅ | Netlify ⚠️ |
|---------|------------|------------|
| **Database** | Built-in PostgreSQL | External only |
| **File Uploads** | 200MB | 6MB limit |
| **Server Actions** | Full support | Limited |
| **WebSockets** | Yes | No |
| **Function Timeout** | Unlimited | 10 seconds |

---

## 🔧 **Quick Fix Commands**

Run these commands to update the configuration:

```bash
cd /Users/shivang/deepgram/Adelphos-AI-tutor

# Add Netlify plugin
cd intellitutor
npm install --save-dev @netlify/plugin-nextjs@^5.7.2

# Commit and push changes
git add package.json netlify.toml
git commit -m "Add Netlify Next.js plugin and fix configuration"
git push ai-tutor-d main
```

---

## 🎯 **Recommended Solution: Use Railway Instead**

For the best experience with this full-stack app, consider using Railway:

### Why Railway is Better:
- ✅ **Built-in database** - No external setup needed
- ✅ **Full Next.js support** - All features work
- ✅ **Large file uploads** - 200MB limit
- ✅ **WebSocket support** - Voice features work
- ✅ **No function timeouts** - Long-running processes OK

### Railway Setup (5 minutes):
1. Go to [Railway](https://railway.app/)
2. Connect GitHub repository: `Adelphos-tech/AI-tutor-D`
3. Set root directory: `intellitutor`
4. Add PostgreSQL service
5. Set environment variables
6. Deploy!

---

## 📋 **Netlify Deployment Checklist**

If you want to continue with Netlify, ensure:

- [ ] `@netlify/plugin-nextjs` is installed
- [ ] Environment variables are set in Netlify dashboard
- [ ] Build command is `npm run build`
- [ ] Node version is set to `20.18.0`
- [ ] Repository is connected correctly
- [ ] Base directory is set to `intellitutor`
- [ ] Latest code is pushed to `main` branch

---

## 🐛 **Debug Commands**

To debug locally:

```bash
# Test build locally
cd intellitutor
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Test with Netlify CLI
npm install -g netlify-cli
netlify dev
```

---

## 📞 **Next Steps**

1. **Check Netlify build logs** first
2. **Add missing environment variables**
3. **Install the Next.js plugin**
4. **Consider switching to Railway** for full functionality

---

## 🔗 **Useful Links**

- [Netlify Next.js Plugin Docs](https://docs.netlify.com/integrations/frameworks/next-js/)
- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT.md)
- [Environment Variables Reference](./API_KEYS_REFERENCE.txt)

---

**Last Updated:** November 29, 2025  
**Status:** Troubleshooting Netlify "Not Found" error
