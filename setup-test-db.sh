#!/bin/bash

# Docker Setup Script for TrapHouse Kitchen Tests
# This script starts a PostgreSQL container for testing

set -e  # Exit on error

echo "🐳 Setting up Docker PostgreSQL for testing..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo ""
    echo "Please start Docker Desktop:"
    echo "  1. Open Docker Desktop application"
    echo "  2. Wait for Docker to start (whale icon in menu bar)"
    echo "  3. Run this script again"
    echo ""
    exit 1
fi

echo "✅ Docker is running"

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^traphouse-test-db$"; then
    echo "⚠️  Container 'traphouse-test-db' already exists"
    
    # Check if it's running
    if docker ps --format '{{.Names}}' | grep -q "^traphouse-test-db$"; then
        echo "✅ Container is already running"
    else
        echo "🔄 Starting existing container..."
        docker start traphouse-test-db
        echo "✅ Container started"
    fi
else
    echo "🚀 Creating new PostgreSQL container..."
    docker run --name traphouse-test-db \
        -e POSTGRES_USER=traphouse \
        -e POSTGRES_PASSWORD=traphouse_dev_password \
        -e POSTGRES_DB=traphouse_kitchen_test \
        -p 5432:5432 \
        -d postgres:16
    
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 5
    
    # Wait for PostgreSQL to be ready
    until docker exec traphouse-test-db pg_isready -U traphouse > /dev/null 2>&1; do
        echo "   Still waiting..."
        sleep 2
    done
    
    echo "✅ PostgreSQL container created and running"
fi

echo ""
echo "📊 Container Status:"
docker ps --filter name=traphouse-test-db --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "✅ Setup complete! PostgreSQL is running on localhost:5432"
echo ""
echo "📝 Next steps:"
echo "   cd backend"
echo "   npm test"
echo ""
echo "🛑 To stop the container later:"
echo "   docker stop traphouse-test-db"
echo ""
echo "🗑️  To remove the container:"
echo "   docker stop traphouse-test-db && docker rm traphouse-test-db"
echo ""
