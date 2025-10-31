#!/bin/bash
set -e

echo "🚀 Starting Beacon Blast Email Platform..."

# Build frontend
echo "📦 Building frontend..."
npm run build

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
cd backend
pip install -r requirements.txt
cd ..

# Start the application
echo "🌟 Starting application server on port 3000..."
npm start