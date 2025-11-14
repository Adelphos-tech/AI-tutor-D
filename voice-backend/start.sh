#!/bin/bash

echo "🚀 Starting Real-Time Voice AI Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Start server
echo "🎙️ Starting FastAPI server on port 8000..."
python main.py
