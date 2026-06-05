#!/bin/bash
set -e

echo "🚀 BlastCrates Setup Script"
echo "=============================="

# Check dependencies
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || command -v "docker compose" >/dev/null 2>&1 || { echo "❌ Docker Compose is required."; exit 1; }

# Copy env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env from .env.example"
  echo "⚠️  Please edit .env with your configuration before continuing!"
  read -p "Press Enter when ready..."
fi

# Start services
echo "🐳 Starting services..."
docker-compose up -d postgres redis

echo "⏳ Waiting for database..."
sleep 5

# Install backend
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

# Install frontend
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Start full stack
echo "🚀 Starting all services..."
docker-compose up -d

echo ""
echo "✅ BlastCrates is ready!"
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend: http://localhost:3001"
echo "📍 API Docs: http://localhost:3001/api/docs"
echo ""
echo "🔧 Useful commands:"
echo "  make logs          - View logs"
echo "  make logs-backend  - Backend logs"
echo "  make db-shell      - Database shell"
echo "  make stop          - Stop services"
