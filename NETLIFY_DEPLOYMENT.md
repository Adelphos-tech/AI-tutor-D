# Netlify Deployment Guide for AI Tutor

## ⚠️ Important Notice

**This Next.js application uses server-side features that are better suited for Railway deployment:**

- **Prisma Database** - Requires persistent database connection
- **Server Actions** - File uploads up to 200MB
- **API Routes** - Backend functionality
- **Real-time Features** - WebSocket connections (voice backend)

**Recommended:** Use Railway for full-stack deployment instead of Netlify.

---

## If You Must Use Netlify

### Prerequisites

1. **Add Netlify Next.js Plugin** to package.json:
   ```bash
   npm install --save-dev @netlify/plugin-nextjs
   ```

2. **Set up External Database** (Netlify doesn't provide databases):
   - Use Railway Postgres, Supabase, or PlanetScale
   - Update DATABASE_URL in Netlify environment variables

### Netlify Configuration

**File: `netlify.toml`**
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20.18.0"
  DATABASE_URL = "postgresql://dummy:dummy@localhost:5432/dummy"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[functions]
  node_bundler = "esbuild"
```

### Environment Variables in Netlify

```env
# Database (use external provider)
DATABASE_URL=postgresql://user:pass@host:5432/db

# AI Services
GEMINI_API_KEY=your_gemini_key
PINECONE_API_KEY=pcsk_65GWz3_GUoKLuRJcEqDWa1qAFkaNm3q7bGrTktvRruTqkWdC4j9J6f32wwVmNrejJmuYZG
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=document-knowledge-base

# NextAuth
NEXTAUTH_URL=https://your-site.netlify.app
NEXTAUTH_SECRET=your_secret_here

# File Upload
MAX_FILE_SIZE=209715200
```

### Deployment Steps

1. **Connect Repository** to Netlify
2. **Set Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: `20.18.0`
3. **Add Environment Variables** (see above)
4. **Deploy**

### Limitations on Netlify

❌ **File Upload Size** - Limited to 6MB (vs 200MB on Railway)  
❌ **Function Timeout** - 10 seconds max (vs unlimited on Railway)  
❌ **Database** - Must use external provider  
❌ **WebSockets** - Not supported (voice backend won't work)  
❌ **Persistent Storage** - Files are ephemeral  

---

## Recommended: Railway Deployment

✅ **Full Next.js Support** - All features work  
✅ **Integrated Database** - PostgreSQL included  
✅ **Large File Uploads** - Up to 200MB  
✅ **WebSocket Support** - Voice backend compatible  
✅ **Persistent Storage** - Files are saved  
✅ **No Function Limits** - Long-running processes OK  

### Quick Railway Setup

1. **Connect GitHub repo** to Railway
2. **Set Root Directory** to `intellitutor`
3. **Add PostgreSQL service**
4. **Set environment variables**
5. **Deploy** - Everything works out of the box!

---

## Current Status

- ✅ **Railway Configuration** - Complete and tested
- ⚠️ **Netlify Configuration** - Basic setup (limited functionality)

**Recommendation:** Use Railway for the best experience with this full-stack Next.js application.

---

## Troubleshooting Netlify Issues

### "Page not found" Error

**Cause:** Next.js routing not properly configured for static deployment

**Solutions:**
1. Ensure `@netlify/plugin-nextjs` is installed
2. Check `netlify.toml` configuration
3. Verify build output in `.next` directory
4. Check Netlify function logs for errors

### Build Failures

**Common Issues:**
- Node.js version mismatch (use 20.18.0)
- DATABASE_URL not set for Prisma generation
- Missing dependencies
- TypeScript errors

**Solutions:**
- Set NODE_VERSION in netlify.toml
- Add dummy DATABASE_URL for build
- Install all dependencies
- Fix TypeScript errors

### Runtime Errors

**Common Issues:**
- Database connection failures
- Missing environment variables
- Function timeouts
- File upload failures

**Solutions:**
- Use external database provider
- Set all required env vars
- Optimize function performance
- Reduce file size limits

---

## Migration from Netlify to Railway

If you're currently on Netlify and want to migrate:

1. **Export data** from your current database
2. **Set up Railway** project with PostgreSQL
3. **Import data** to Railway database
4. **Update DNS** to point to Railway
5. **Enjoy full functionality!**

---

**Last Updated:** November 28, 2025  
**Status:** Railway recommended, Netlify basic support only
