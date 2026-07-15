#!/bin/bash

# Run Tests Script for TrapHouse Kitchen
# This script sets up the database, runs tests, and optionally cleans up

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧪 TrapHouse Kitchen - Test Runner"
echo "=================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo ""
    echo "Please start Docker Desktop and try again:"
    echo "  1. Open Docker Desktop application"
    echo "  2. Wait for Docker to start (whale icon should be active in menu bar)"
    echo "  3. Run this script again: ./run-tests.sh"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Setup database
echo ""
echo "📦 Setting up test database..."
./setup-test-db.sh

# Update DATABASE_URL for tests to use test database
export DATABASE_URL="postgresql://traphouse:traphouse_dev_password@localhost:5432/traphouse_kitchen_test?schema=public"

# Run database migrations (align with CI: migrate deploy)
echo ""
echo "🔄 Applying Prisma migrations to test database..."
cd backend

npx prisma migrate deploy

echo -e "${GREEN}✅ Database schema ready${NC}"

# Run tests
echo ""
echo "🧪 Running full backend test suite (unit + integration + performance)..."
echo "================================================================="
echo ""

npm run test:all

TEST_EXIT_CODE=$?

cd ..

# Check test results
echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    
    # Ask if user wants to cleanup
    echo ""
    read -p "Do you want to stop and remove the test database container? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./cleanup-test-db.sh
    else
        echo ""
        echo "ℹ️  Test database is still running"
        echo "   To stop it later, run: ./cleanup-test-db.sh"
    fi
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "The test database is still running for debugging."
    echo "To stop it, run: ./cleanup-test-db.sh"
    exit 1
fi

echo ""
echo "🎉 Done!"
echo ""
