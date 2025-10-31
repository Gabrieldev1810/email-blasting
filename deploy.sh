#!/usr/bin/env bash
# deployment-script.sh
# This script forces Docker build and bypasses Nixpacks

echo "🐳 Force Docker deployment - bypassing Nixpacks detection"
echo "📦 Building with custom Dockerfile (Node.js 20 + Python)"

# Build the Docker image
docker build -t beacon-blast-app .

# Run the container
docker run -d -p 3000:3000 \
    -e NODE_ENV=production \
    -e FLASK_ENV=production \
    -e PORT=3000 \
    --name beacon-blast-production \
    beacon-blast-app

echo "✅ Application started on port 3000"
echo "🔗 Admin setup will run automatically"
echo "👤 Admin Login: gab.duano101898@gmail.com / Gabriel_101898@@"