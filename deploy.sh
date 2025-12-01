#!/bin/bash

echo "🚂 Preparing AI Academic Tutor for Railway Deployment..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
fi

# Add all files
echo "📦 Adding files to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Deploy AI Academic Tutor to Railway - $(date)"

# Check if remote exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "🔗 Please add your GitHub repository URL:"
    echo "git remote add origin https://github.com/yourusername/ai-academic-tutor.git"
    echo ""
    echo "Then run: git push -u origin main"
else
    echo "🚀 Pushing to GitHub..."
    git push origin main
fi

echo ""
echo "✅ Ready for Railway deployment!"
echo ""
echo "Next steps:"
echo "1. Go to https://railway.app"
echo "2. Click 'Start a New Project'"
echo "3. Select 'Deploy from GitHub repo'"
echo "4. Choose your repository"
echo "5. Add environment variables (see DEPLOYMENT.md)"
echo "6. Add PostgreSQL database"
echo ""
echo "🎉 Your AI Academic Tutor will be live!"
