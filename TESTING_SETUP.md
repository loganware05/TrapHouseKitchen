# Testing Setup Guide

## Database Requirement

The integration tests require a running PostgreSQL database. You have several options:

## Option 1: Use Docker (Recommended for Testing)

Run PostgreSQL in a Docker container for testing:

```bash
# Start PostgreSQL in Docker
docker run --name traphouse-test-db \
  -e POSTGRES_USER=traphouse \
  -e POSTGRES_PASSWORD=traphouse_dev_password \
  -e POSTGRES_DB=traphouse_kitchen_test \
  -p 5432:5432 \
  -d postgres:16

# Run tests
cd backend
npm test

# Stop the container when done
docker stop traphouse-test-db
docker rm traphouse-test-db
```

## Option 2: Install PostgreSQL Locally

### Using Homebrew (macOS)
```bash
# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL
brew services start postgresql@16

# Create test database
createdb traphouse_kitchen_test

# Run tests
cd backend
npm test
```

### Create Test Database
```bash
psql postgres
CREATE DATABASE traphouse_kitchen_test;
CREATE USER traphouse WITH PASSWORD 'traphouse_dev_password';
GRANT ALL PRIVILEGES ON DATABASE traphouse_kitchen_test TO traphouse;
\q
```

## Option 3: Use Separate Test Database URL

Create a `.env.test` file for test-specific configuration:

```bash
# backend/.env.test
DATABASE_URL=postgresql://user:password@remote-host:5432/test_db
JWT_SECRET=test-secret-key
REVIEW_WINDOW_DAYS=30
```

Update `vitest.config.ts` to load `.env.test`:

```typescript
import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
```

## Option 4: Skip Tests (Not Recommended)

If you don't need to run tests locally:

```bash
# Skip tests and proceed with deployment
# Tests will still be documented and available for CI/CD
```

## Current Setup

Your current `.env` points to:
```
DATABASE_URL=postgresql://traphouse:traphouse_dev_password@localhost:5432/traphouse_kitchen
```

This requires PostgreSQL to be running on your local machine.

## Recommended Approach

For local development and testing, I recommend **Option 1 (Docker)** because:
- ✅ No permanent installation needed
- ✅ Easy to start/stop
- ✅ Isolated from other projects
- ✅ Consistent environment

## Run Tests

Once database is running:

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run specific test file
npx vitest run tests/integration/review-flow.test.ts
```

## CI/CD Setup

For GitHub Actions or similar CI/CD:

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: traphouse
      POSTGRES_PASSWORD: traphouse_dev_password
      POSTGRES_DB: traphouse_kitchen_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

steps:
  - name: Run tests
    run: |
      cd backend
      npm install
      npm test
    env:
      DATABASE_URL: postgresql://traphouse:traphouse_dev_password@localhost:5432/traphouse_kitchen_test
```

## Troubleshooting

### Error: "Can't reach database server at localhost:5432"
- PostgreSQL is not running
- Use one of the options above to start a database

### Error: "Database does not exist"
```bash
# Create the database
createdb traphouse_kitchen_test
# Or with Docker
docker exec -it traphouse-test-db createdb -U traphouse traphouse_kitchen_test
```

### Error: "Permission denied"
```bash
# Grant permissions to user
psql postgres
GRANT ALL PRIVILEGES ON DATABASE traphouse_kitchen_test TO traphouse;
```

## Production Testing

The integration tests are designed to:
- ✅ Clean up test data automatically
- ✅ Use separate test users (emails contain "test-")
- ✅ Not interfere with production data

However, **never run tests against production database**.
