# Railway Deployment Setup Guide

## Required Environment Variables

Set these environment variables in your Railway project dashboard:

### 1. Database Configuration
```
DATABASE_URL=your_postgresql_database_url_here
```

### 2. API Keys
```
DEEPGRAM_API_KEY=your_deepgram_api_key_here
GROQ_API_KEY=your_groq_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
```

### 3. Configuration
```
NODE_ENV=production
PINECONE_INDEX_NAME=ai-tutor-docs
UPLOAD_DIR=./uploads
```

### 4. React App Variables (for frontend)
```
REACT_APP_DEEPGRAM_API_KEY=your_deepgram_api_key_here
REACT_APP_API_URL=https://ai-tutor-d-production.up.railway.app/api
```

## Deployment Steps

1. **Set Environment Variables**: Copy all variables above to Railway dashboard
2. **Deploy**: Push code to GitHub, Railway will auto-deploy
3. **Check Logs**: Monitor Railway logs for any startup errors
4. **Test**: Visit your Railway URL to verify deployment

## Common Issues

### 502 Bad Gateway
- **Cause**: Missing environment variables or server startup failure
- **Solution**: Check Railway logs and ensure all env vars are set

### Build Failures
- **Cause**: React build process failing during deployment
- **Solution**: We've pre-built the React app locally and simplified the start command

### Database Connection Errors
- **Cause**: Incorrect DATABASE_URL or network issues
- **Solution**: Verify DATABASE_URL format and test connection

## Troubleshooting Commands

Check Railway logs:
```bash
railway logs
```

Test local deployment:
```bash
npm run start:production
```

Verify environment variables:
```bash
railway variables
```

## Port Configuration

Railway automatically sets the PORT environment variable. The server is configured to use:
```javascript
const PORT = process.env.PORT || 5001;
```

## File Structure

The deployment includes:
- `server.js` - Main server file
- `client/build/` - Pre-built React app
- `routes/` - API routes
- `services/` - Backend services
- `config/` - Database and Pinecone configuration

## Success Indicators

When deployment is successful, you should see:
- ✅ Server running on port [PORT]
- ✅ Database connected successfully  
- ✅ Pinecone initialized successfully
- ✅ WebSocket available

## Support

If issues persist:
1. Check Railway deployment logs
2. Verify all environment variables are set
3. Test API endpoints: `https://your-app.railway.app/api/documents`
4. Check database connectivity
