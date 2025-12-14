#!/bin/bash

echo "🚀 Deploying fixes to Railway..."
echo "📅 $(date)"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the project root."
    exit 1
fi

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "🔧 Initializing git repository..."
    git init
    git branch -M main
fi

# Add all changes
echo "📝 Adding changes to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Fix: Add null checks and error handling for file upload

- Fixed 'Cannot read properties of undefined (reading length)' error
- Added comprehensive null checks in handleFileSelect functions
- Enhanced error handling in onDrop callback
- Improved state initialization with safe defaults
- Added detailed logging for debugging
- Fixed both DocumentUpload and DocumentUploadSimple components

This resolves the white screen issue on production mobile uploads."

# Check if Railway remote exists
if ! git remote | grep -q "origin"; then
    echo "🔗 Adding Railway remote..."
    # You'll need to replace this with your actual Railway git URL
    echo "⚠️  Please add your Railway git remote manually:"
    echo "   git remote add origin YOUR_RAILWAY_GIT_URL"
    echo "   Then run: git push origin main"
else
    echo "🚀 Pushing to Railway..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully deployed to Railway!"
        echo "🌐 Your app should be updating at: https://ai-tutor-d-production.up.railway.app/"
        echo "⏳ Please wait 2-3 minutes for the deployment to complete."
    else
        echo "❌ Deployment failed. Please check the error messages above."
        exit 1
    fi
fi

echo ""
echo "🎯 What was fixed:"
echo "  - File upload null pointer errors"
echo "  - Mobile white screen issue"
echo "  - Enhanced error handling and logging"
echo ""
echo "🧪 Test the fixes at:"
echo "  - https://ai-tutor-d-production.up.railway.app/upload"
echo "  - https://ai-tutor-d-production.up.railway.app/direct-test"
echo ""
echo "📊 Run production tests after deployment:"
echo "  npm run test:production:full"
