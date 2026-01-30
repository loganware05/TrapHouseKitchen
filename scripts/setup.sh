#!/bin/bash

# Development setup script
# This script sets up the development environment

set -e

echo "🔧 TrapHouse Kitchen - Development Setup"
echo "=========================================="
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20 or higher is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"
echo ""

# Check if Docker is installed
echo "🐳 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not found. Install Docker to use containerized setup."
    echo "   Visit: https://docs.docker.com/get-docker/"
else
    echo "✅ Docker is installed: $(docker --version)"
fi
echo ""

# Install root dependencies
echo "📥 Installing root dependencies..."
npm install
echo ""

# Install backend dependencies
echo "📥 Installing backend dependencies..."
cd backend
npm install
echo ""

# Install frontend dependencies  
echo "📥 Installing frontend dependencies..."
cd ../frontend
npm install
cd ..
echo ""

# Setup environment files
echo "🔐 Setting up environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env from example"
    echo "⚠️  Please update backend/.env with your configuration"
else
    echo "✅ backend/.env already exists"
fi
echo ""

# Generate JWT secret
if [ -f backend/.env ]; then
    if grep -q "your-super-secret-jwt-key-change-in-production" backend/.env; then
        JWT_SECRET=$(openssl rand -base64 32)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|your-super-secret-jwt-key-change-in-production|$JWT_SECRET|g" backend/.env
        else
            sed -i "s|your-super-secret-jwt-key-change-in-production|$JWT_SECRET|g" backend/.env
        fi
        echo "✅ Generated secure JWT secret"
    fi
fi
echo ""

# Check if Docker is running
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo "🚀 Starting Docker services..."
    docker-compose up -d postgres
    
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 10
    
    echo "🗄️  Running database migrations..."
    cd backend
    npx prisma migrate deploy
    
    echo "🌱 Seeding database..."
    npx prisma db seed || echo "⚠️  No seed file found, skipping..."
    cd ..
    echo ""
    
    echo "✅ Database setup complete!"
else
    echo "⚠️  Docker is not running. Please start Docker to set up the database."
    echo "   Or manually set up PostgreSQL and update DATABASE_URL in backend/.env"
fi
echo ""

echo "=========================================="
echo "✅ Setup Complete!"
echo ""
echo "📚 Next steps:"
echo ""
echo "  1. Review backend/.env and update if needed"
echo "  2. Start the development servers:"
echo "     npm run dev"
echo ""
echo "  3. Or start with Docker:"
echo "     docker-compose up"
echo ""
echo "  4. Access the application:"
echo "     - Frontend: http://localhost:5173"
echo "     - Backend:  http://localhost:3001"
echo "     - Health:   http://localhost:3001/health"
echo ""
echo "  5. Default chef login:"
echo "     - Email:    chef@traphouse.com"
echo "     - Password: chef123"
echo ""
echo "📖 Read SETUP_GUIDE.md for detailed instructions"
echo "=========================================="

