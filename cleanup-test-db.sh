#!/bin/bash

# Cleanup Script for TrapHouse Kitchen Test Database
# This script stops and removes the test PostgreSQL container

set -e

echo "🧹 Cleaning up test database container..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "⚠️  Docker is not running"
    exit 0
fi

# Check if container exists
if docker ps -a --format '{{.Names}}' | grep -q "^traphouse-test-db$"; then
    # Stop if running
    if docker ps --format '{{.Names}}' | grep -q "^traphouse-test-db$"; then
        echo "🛑 Stopping container..."
        docker stop traphouse-test-db
    fi
    
    # Remove container
    echo "🗑️  Removing container..."
    docker rm traphouse-test-db
    
    echo "✅ Cleanup complete!"
else
    echo "ℹ️  No test database container found"
fi

echo ""
