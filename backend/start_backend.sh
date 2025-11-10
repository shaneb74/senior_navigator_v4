#!/bin/bash
# Backend startup script

cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🚀 Starting Senior Navigator Backend..."
echo "📍 API will be available at: http://localhost:3000"
echo ""

npm start
