#!/bin/bash

# Validation script to check if the application is properly set up
# Run this after setup.sh to verify everything is working

set -e

echo "🔍 TrapHouse Kitchen - Setup Validation"
echo "========================================"
echo ""

ERRORS=0
WARNINGS=0

# Function to check command
check_command() {
    if command -v $1 &> /dev/null; then
        echo "✅ $1 is installed"
        return 0
    else
        echo "❌ $1 is NOT installed"
        ((ERRORS++))
        return 1
    fi
}

# Function to check file
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1 exists"
        return 0
    else
        echo "❌ $1 is MISSING"
        ((ERRORS++))
        return 1
    fi
}

# Function to check directory
check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1 exists"
        return 0
    else
        echo "❌ $1 is MISSING"
        ((ERRORS++))
        return 1
    fi
}

# Function to check port
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ Port $1 is in use (service running)"
        return 0
    else
        echo "⚠️  Port $1 is not in use (service not running)"
        ((WARNINGS++))
        return 1
    fi
}

# Function to check URL
check_url() {
    if curl -s --head --request GET "$1" | grep "200\|301\|302" > /dev/null; then
        echo "✅ $1 is responding"
        return 0
    else
        echo "⚠️  $1 is not responding"
        ((WARNINGS++))
        return 1
    fi
}

echo "📋 Checking Prerequisites..."
echo "----------------------------"
check_command node
check_command npm
check_command docker
check_command docker-compose || check_command docker
echo ""

echo "📁 Checking Project Structure..."
echo "--------------------------------"
check_dir "backend"
check_dir "frontend"
check_dir "backend/src"
check_dir "frontend/src"
check_dir "backend/prisma"
echo ""

echo "📄 Checking Configuration Files..."
echo "-----------------------------------"
check_file "package.json"
check_file "backend/package.json"
check_file "frontend/package.json"
check_file "backend/prisma/schema.prisma"
check_file "backend/tsconfig.json"
check_file "frontend/tsconfig.json"
check_file "docker-compose.yml"
check_file "Dockerfile"
check_file "README.md"
check_file "SETUP_GUIDE.md"
echo ""

echo "🔐 Checking Environment Files..."
echo "---------------------------------"
if check_file "backend/.env"; then
    if grep -q "your-super-secret-jwt-key-change-in-production" backend/.env; then
        echo "⚠️  JWT_SECRET still uses default value - should be changed!"
        ((WARNINGS++))
    else
        echo "✅ JWT_SECRET has been customized"
    fi
fi
echo ""

echo "📦 Checking Dependencies..."
echo "---------------------------"
if [ -d "node_modules" ]; then
    echo "✅ Root dependencies installed"
else
    echo "❌ Root dependencies NOT installed - run: npm install"
    ((ERRORS++))
fi

if [ -d "backend/node_modules" ]; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Backend dependencies NOT installed - run: cd backend && npm install"
    ((ERRORS++))
fi

if [ -d "frontend/node_modules" ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend dependencies NOT installed - run: cd frontend && npm install"
    ((ERRORS++))
fi
echo ""

echo "🐳 Checking Docker Services..."
echo "-------------------------------"
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo "✅ Docker is running"
    
    # Check if containers are running
    if docker-compose ps | grep -q "Up"; then
        echo "✅ Docker containers are running"
    else
        echo "⚠️  Docker containers are not running - run: docker-compose up -d"
        ((WARNINGS++))
    fi
else
    echo "⚠️  Docker is not running"
    ((WARNINGS++))
fi
echo ""

echo "🌐 Checking Services..."
echo "-----------------------"
check_port 3001 # Backend
check_port 5173 # Frontend
check_port 5432 # PostgreSQL
echo ""

echo "🔗 Checking Service Health..."
echo "------------------------------"
if check_port 3001 && check_port 5173; then
    sleep 2
    check_url "http://localhost:3001/health"
    check_url "http://localhost:5173"
fi
echo ""

echo "🗄️  Checking Database..."
echo "------------------------"
if [ -f "backend/.env" ]; then
    cd backend
    if npx prisma db pull --preview-feature &> /dev/null 2>&1; then
        echo "✅ Database connection successful"
    else
        echo "⚠️  Cannot connect to database"
        echo "   Make sure PostgreSQL is running and DATABASE_URL is correct"
        ((WARNINGS++))
    fi
    cd ..
fi
echo ""

echo "========================================"
echo "📊 Validation Summary"
echo "========================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "🎉 Perfect! Everything is set up correctly!"
    echo ""
    echo "You can now:"
    echo "  • Start development: npm run dev"
    echo "  • Or use Docker: docker-compose up -d"
    echo "  • Access frontend: http://localhost:5173"
    echo "  • Access backend: http://localhost:3001"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "✅ Setup is complete with $WARNINGS warning(s)"
    echo ""
    echo "The warnings above are not critical but should be addressed."
    echo "You can proceed with development."
    echo ""
    exit 0
else
    echo "❌ Found $ERRORS error(s) and $WARNINGS warning(s)"
    echo ""
    echo "Please fix the errors above before proceeding."
    echo "Run ./setup.sh to fix common issues."
    echo ""
    exit 1
fi

