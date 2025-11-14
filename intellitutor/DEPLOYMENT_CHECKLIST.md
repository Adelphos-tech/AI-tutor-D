# IntelliTutor - Deployment Checklist

## 🚀 Pre-Deployment Checklist

### 1. Environment Setup ✅
- [ ] Copy `env.example` to `.env`
- [ ] Set `DATABASE_URL` (PostgreSQL connection string)
- [ ] Set `GEMINI_API_KEY` (from Google AI Studio)
- [ ] Set `PINECONE_API_KEY` (from Pinecone dashboard)
- [ ] Set `PINECONE_ENVIRONMENT` (e.g., "us-east-1-aws")
- [ ] Set `PINECONE_INDEX_NAME` (default: "intellitutor-vectors")
- [ ] Set `NEXTAUTH_URL` (your production URL)
- [ ] Generate `NEXTAUTH_SECRET` (use: `openssl rand -base64 32`)

### 2. Database Setup ✅
- [ ] PostgreSQL database created
- [ ] Run `npx prisma generate`
- [ ] Run `npx prisma db push` (or `npx prisma migrate deploy` for production)
- [ ] Test database connection with `npx prisma studio`

### 3. Pinecone Setup ✅
- [ ] Pinecone account created
- [ ] Index created with:
  - Name: `intellitutor-vectors`
  - Dimensions: `768`
  - Metric: `cosine`
  - Cloud: Any (AWS, GCP, Azure)
- [ ] API key copied to `.env`

### 4. API Keys Verification ✅
- [ ] Gemini API key tested (make a test request)
- [ ] Pinecone API key tested (list indexes)
- [ ] Database connection tested

### 5. Local Testing ✅
- [ ] Run `npm run dev`
- [ ] Visit `http://localhost:3000`
- [ ] Test landing page loads
- [ ] Test library page loads
- [ ] Test upload page loads
- [ ] Upload a small test PDF
- [ ] Verify processing completes
- [ ] Check database for created records
- [ ] Check Pinecone for vectors

### 6. Build Testing ✅
- [ ] Run `npm run build`
- [ ] Fix any build errors
- [ ] Run `npm start`
- [ ] Test production build locally

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

#### Steps:
1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Configure project settings

3. **Add Environment Variables**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add all variables from your `.env` file
   - Make sure to add them for all environments (Production, Preview, Development)

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Visit your live site!

#### Vercel-Specific Settings:
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

### Option 2: Railway

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and Initialize**
   ```bash
   railway login
   railway init
   ```

3. **Add Environment Variables**
   ```bash
   railway variables set DATABASE_URL="your-value"
   railway variables set GEMINI_API_KEY="your-value"
   # ... add all variables
   ```

4. **Deploy**
   ```bash
   railway up
   ```

### Option 3: DigitalOcean App Platform

1. **Create App**
   - Go to DigitalOcean dashboard
   - Create new App
   - Connect GitHub repository

2. **Configure Build**
   - Build Command: `npm run build`
   - Run Command: `npm start`

3. **Add Environment Variables**
   - Add all variables from `.env`

4. **Deploy**
   - Click "Deploy"

## 📊 Database Options

### Option 1: Neon (Recommended for Free Tier)
- Sign up at [neon.tech](https://neon.tech)
- Create a new project
- Copy connection string to `DATABASE_URL`
- **Free Tier**: 3GB storage, 1 project

### Option 2: Supabase
- Sign up at [supabase.com](https://supabase.com)
- Create a new project
- Get connection string from Settings → Database
- **Free Tier**: 500MB storage, 2 projects

### Option 3: Railway
- Sign up at [railway.app](https://railway.app)
- Add PostgreSQL plugin
- Copy connection string
- **Free Tier**: $5 credit/month

### Option 4: Vercel Postgres
- Available in Vercel dashboard
- Click "Storage" → "Create Database" → "Postgres"
- Connection string auto-added to environment variables
- **Pricing**: Starts at $0.25/GB/month

## 🔒 Security Checklist

- [ ] All API keys in environment variables (not hardcoded)
- [ ] `.env` file in `.gitignore`
- [ ] `uploads/` directory in `.gitignore`
- [ ] CORS configured properly
- [ ] Rate limiting enabled (consider adding)
- [ ] File upload size limits enforced
- [ ] Input validation on all forms
- [ ] SQL injection protection (Prisma handles this)
- [ ] XSS protection (React handles this)

## 📈 Performance Optimization

- [ ] Images optimized (use Next.js Image component)
- [ ] Lazy loading implemented where appropriate
- [ ] Database indexes created (check `schema.prisma`)
- [ ] API response caching considered
- [ ] CDN configured for static assets
- [ ] Bundle size analyzed (`npm run build` shows sizes)

## 🧪 Post-Deployment Testing

### Smoke Tests:
1. [ ] Landing page loads
2. [ ] Library page loads
3. [ ] Upload page loads
4. [ ] File upload works
5. [ ] Processing completes
6. [ ] Database records created
7. [ ] Vectors stored in Pinecone
8. [ ] No console errors
9. [ ] Mobile responsive
10. [ ] Dark mode works

### Load Testing (Optional):
- [ ] Test with multiple concurrent uploads
- [ ] Test with large files (close to 200MB)
- [ ] Test with many materials in library
- [ ] Monitor API usage and costs

## 📊 Monitoring Setup

### Recommended Tools:
1. **Vercel Analytics** (if using Vercel)
   - Automatically enabled
   - View in Vercel dashboard

2. **Sentry** (Error Tracking)
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard@latest -i nextjs
   ```

3. **Prisma Pulse** (Database Monitoring)
   - Available in Prisma Cloud
   - Real-time database insights

4. **Pinecone Monitoring**
   - Check usage in Pinecone dashboard
   - Set up alerts for quota limits

## 💰 Cost Monitoring

### Free Tier Limits:
- **Vercel**: 100GB bandwidth, 100 hours serverless
- **Gemini**: 60 requests/min, 1500 requests/day
- **Pinecone**: 1 index, 100K vectors, 2M queries/month
- **Neon**: 3GB storage, 1 project

### Set Up Alerts:
- [ ] Vercel usage alerts
- [ ] Gemini API quota alerts
- [ ] Pinecone usage alerts
- [ ] Database storage alerts

## 🔄 CI/CD Setup (Optional)

### GitHub Actions Example:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - run: npx prisma generate
      # Add deployment step
```

## 📝 Documentation Updates

- [ ] Update README with production URL
- [ ] Add deployment date to PROJECT_SUMMARY
- [ ] Document any production-specific configurations
- [ ] Create runbook for common issues
- [ ] Document backup and recovery procedures

## 🎉 Launch Checklist

### Before Launch:
- [ ] All tests passing
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Security review complete
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Error tracking enabled

### Launch Day:
- [ ] Deploy to production
- [ ] Verify all features work
- [ ] Monitor error rates
- [ ] Monitor performance
- [ ] Be ready for quick rollback if needed

### Post-Launch:
- [ ] Monitor for 24 hours
- [ ] Check error logs
- [ ] Review user feedback
- [ ] Plan first iteration

## 🆘 Rollback Plan

If something goes wrong:

1. **Vercel**: Click "Rollback" in deployment dashboard
2. **Railway**: `railway rollback`
3. **Database**: Restore from backup
4. **Pinecone**: Vectors are append-only, safe to keep

## 📞 Support Contacts

- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Gemini API**: [Google AI Forum](https://discuss.ai.google.dev/)
- **Pinecone Support**: [support.pinecone.io](https://support.pinecone.io)
- **Prisma Support**: [prisma.io/support](https://www.prisma.io/support)

---

## ✅ Deployment Complete!

Once all items are checked:
- [ ] Application is live
- [ ] All features tested
- [ ] Monitoring active
- [ ] Documentation updated
- [ ] Team notified

**Congratulations! IntelliTutor is deployed! 🎉**

---

*Last Updated: November 7, 2025*
