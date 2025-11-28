# Railway Deployment Debugging Guide

## Common Build Errors & Solutions

### ✅ FIXED: Error 1 - Node.js Version Mismatch

**Error:**
```
You are using Node.js 18.20.5. For Next.js, Node.js version ">=20.9.0" is required.
```

**Root Cause:** Railway was using Node.js 18, but Next.js 16 requires Node >=20.9.0

**Solution Applied:**
- Added `.node-version` file with `20.18.0`
- Added `.nvmrc` file with `20.18.0`
- Added `engines` field to `package.json`

**Files Changed:**
```
✅ intellitutor/.node-version
✅ intellitutor/.nvmrc
✅ intellitutor/package.json
```

---

### ✅ FIXED: Error 2 - Invalid Nixpacks Configuration

**Error:**
```
error: undefined variable 'nodejs-20_x'
at /app/.nixpacks/nixpkgs-*.nix:19:9
```

**Root Cause:** Invalid package name `nodejs-20_x` in custom `nixpacks.toml`

**Solution Applied:**
- Removed custom `nixpacks.toml` file
- Let Railway auto-detect Node.js from `.node-version`
- Added `Procfile` for explicit start command

**Files Changed:**
```
❌ intellitutor/nixpacks.toml (removed)
✅ intellitutor/Procfile (added)
```

---

### ✅ FIXED: Error 3 - Prisma DATABASE_URL Missing During Build

**Error:**
```
Failed to load config file "/app" as a TypeScript/JavaScript module.
Error: PrismaConfigEnvError: Missing required environment variable: DATABASE_URL
npm error command failed
npm error command sh -c prisma generate
```

**Root Cause:** 
- Prisma's `postinstall` hook runs during `npm ci`
- Environment variables (including DATABASE_URL) are not available during build phase
- Prisma needs DATABASE_URL in schema, even though it doesn't connect during `generate`

**Solution Applied:**
1. Removed `postinstall` script from `package.json`
2. Set DATABASE_URL inline in build script command
3. Railway.toml approach didn't work, inline env var is more reliable

**Files Changed:**
```
✅ intellitutor/package.json - Removed postinstall, added inline DATABASE_URL to build script
✅ intellitutor/railway.toml - Removed build.env (wasn't being picked up)
```

**Final Build Script:**
```json
"build": "DATABASE_URL=\"postgresql://dummy:dummy@localhost:5432/dummy\" prisma generate && next build"
```

**How It Works:**
- **Build Phase:** Inline env var sets dummy DATABASE_URL for `prisma generate`
- **Runtime:** Real DATABASE_URL from Railway environment variables is used

---

## Current Configuration

### package.json
```json
{
  "engines": {
    "node": ">=20.9.0",
    "npm": ">=10.0.0"
  },
  "scripts": {
    "build": "prisma generate && next build",
    "start": "next start"
  }
}
```

### railway.toml
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### .node-version
```
20.18.0
```

### Procfile
```
web: npm start
```

---

## Railway Settings Checklist

### ✅ Service Configuration

**Root Directory:**
```
intellitutor
```

**Build Command:** (auto-detected)
```
npm run build
```

**Start Command:** (from Procfile)
```
npm start
```

---

### ✅ Environment Variables Required

**Must be set in Railway dashboard:**

```env
# Database (use Railway Postgres reference)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Gemini API for LLM
GEMINI_API_KEY=your_gemini_api_key_here

# Pinecone for vector storage
PINECONE_API_KEY=pcsk_65GWz3_GUoKLuRJcEqDWa1qAFkaNm3q7bGrTktvRruTqkWdC4j9J6f32wwVmNrejJmuYZG
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=intellitutor-vectors

# NextAuth configuration
NEXTAUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# Optional settings
MAX_FILE_SIZE=209715200
UPLOAD_DIR=./uploads
```

---

## Build Phase Breakdown

### Phase 1: Setup
```
✅ Detect Node.js version from .node-version
✅ Install Node.js 20.18.0
✅ Set up npm environment
```

### Phase 2: Install
```
✅ Run: npm ci
✅ Install all dependencies
✅ Install Prisma CLI (dev dependency)
⚠️  Skip postinstall (removed to avoid DATABASE_URL error)
```

### Phase 3: Build
```
✅ Use dummy DATABASE_URL from railway.toml
✅ Run: prisma generate (generates Prisma Client)
✅ Run: next build (builds Next.js app)
✅ Output: .next/ directory with production build
```

### Phase 4: Deploy
```
✅ Use real DATABASE_URL from Railway env vars
✅ Run: npm start
✅ Start Next.js production server
```

---

## Debugging Commands

### Check Node Version in Railway
```bash
node --version
# Should output: v20.18.0 or similar
```

### Verify Prisma Client Generated
```bash
ls -la src/generated/prisma/
# Should show generated Prisma client files
```

### Test Database Connection
```bash
npx prisma db push
# Should connect to Railway Postgres
```

### Check Environment Variables
```bash
printenv | grep -E '(DATABASE_URL|GEMINI|PINECONE|NEXTAUTH)'
# Should show all required env vars
```

---

## Potential Future Issues

### Issue: Build succeeds but app crashes on start

**Symptoms:**
```
Error: GEMINI_API_KEY is not defined
Error: PINECONE_API_KEY is not defined
```

**Solution:**
1. Go to Railway dashboard
2. Navigate to Variables tab
3. Add all missing environment variables
4. Redeploy

---

### Issue: Database migration errors

**Symptoms:**
```
Error: Table 'User' does not exist
Error: P1001: Can't reach database server
```

**Solution:**
1. Ensure PostgreSQL service is created and running
2. Check DATABASE_URL references correct service
3. Run migration manually:
   ```bash
   npx prisma db push
   ```

---

### Issue: Prisma Client version mismatch

**Symptoms:**
```
Error: Prisma Client version mismatch
Expected: 6.19.0
Found: 6.18.0
```

**Solution:**
```bash
npm install @prisma/client@latest prisma@latest
npx prisma generate
```

---

### Issue: File uploads fail in production

**Symptoms:**
```
Error: ENOENT: no such file or directory, open '/app/uploads/...'
```

**Solution:**
Railway has ephemeral filesystem. Use cloud storage:
1. Set up AWS S3, Cloudflare R2, or similar
2. Add credentials to Railway env vars
3. Update file upload logic to use cloud storage

---

## Success Indicators

### ✅ Build Success
```
✓ Build completed successfully
✓ Output: .next/standalone
✓ Duration: ~2-3 minutes
```

### ✅ Deploy Success
```
✓ Service is running
✓ Health check passed
✓ Public URL is accessible
```

### ✅ Runtime Success
```
✓ App loads without errors
✓ Database connection established
✓ API routes responding
✓ File uploads working (if configured)
```

---

## Emergency Rollback

If deployment fails catastrophically:

1. **Find last working commit:**
   ```bash
   git log --oneline
   ```

2. **Revert to working version:**
   ```bash
   git reset --hard <commit-hash>
   git push ai-tutor-d main --force
   ```

3. **Railway will auto-deploy the reverted version**

---

## Support Resources

- **Railway Docs:** https://docs.railway.app/
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Prisma Railway Guide:** https://www.prisma.io/docs/guides/deployment/railway
- **Nixpacks Reference:** https://nixpacks.com/

---

## Change Log

| Date | Issue | Solution | Commit |
|------|-------|----------|--------|
| 2025-11-28 | Node.js 18 vs 20 | Added .node-version | 6c5c565 |
| 2025-11-28 | nodejs-20_x error | Removed nixpacks.toml | 214a53d |
| 2025-11-28 | DATABASE_URL build error | Inline env var in build script | dbb073e |

---

**Last Updated:** November 28, 2025  
**Status:** All known build errors resolved ✅  
**Next:** Monitor deployment and add runtime env vars
