# Docker Testing Scripts

This directory contains helper scripts for running integration tests with Docker.

## Scripts

### 🚀 `run-tests.sh` (Recommended)
**All-in-one script that handles everything:**
- Checks if Docker is running
- Sets up PostgreSQL test database
- Runs database migrations
- Executes all tests
- Optionally cleans up after tests

**Usage:**
```bash
./run-tests.sh
```

---

### 🐳 `setup-test-db.sh`
**Sets up the PostgreSQL Docker container for testing:**
- Creates a new container named `traphouse-test-db`
- Uses PostgreSQL 16
- Exposes on port 5432
- Waits for PostgreSQL to be ready

**Usage:**
```bash
./setup-test-db.sh
```

---

### 🧹 `cleanup-test-db.sh`
**Stops and removes the test database container:**
- Stops the container if running
- Removes the container completely
- Frees up port 5432

**Usage:**
```bash
./cleanup-test-db.sh
```

---

## Quick Start

### First Time Setup

1. **Start Docker Desktop** (if not already running)
   - Look for the whale icon in your menu bar
   - Wait until it says "Docker Desktop is running"

2. **Run the tests:**
   ```bash
   ./run-tests.sh
   ```

That's it! The script will handle everything else.

---

## Manual Testing Workflow

If you want more control:

```bash
# 1. Start the database
./setup-test-db.sh

# 2. Run tests manually
cd backend
npm test

# 3. Clean up when done
cd ..
./cleanup-test-db.sh
```

---

## Troubleshooting

### "Docker is not running"
- Open Docker Desktop application
- Wait for the whale icon in menu bar to become active
- Run the script again

### "Port 5432 is already in use"
You might have another PostgreSQL instance running:
```bash
# Stop other PostgreSQL services
brew services stop postgresql

# Or use a different port in setup-test-db.sh
# Change: -p 5432:5432
# To:     -p 5433:5432
# Then update DATABASE_URL to use port 5433
```

### "Container already exists"
The scripts handle this automatically, but you can manually clean up:
```bash
./cleanup-test-db.sh
./setup-test-db.sh
```

### Tests are failing
1. Check that migrations ran successfully:
   ```bash
   cd backend
   npx prisma db push
   ```

2. Check container logs:
   ```bash
   docker logs traphouse-test-db
   ```

3. Connect to the database to inspect:
   ```bash
   docker exec -it traphouse-test-db psql -U traphouse -d traphouse_kitchen_test
   ```

---

## Database Connection Details

When the test database is running:

- **Host:** localhost
- **Port:** 5432
- **Database:** traphouse_kitchen_test
- **User:** traphouse
- **Password:** traphouse_dev_password
- **Connection String:** `postgresql://traphouse:traphouse_dev_password@localhost:5432/traphouse_kitchen_test`

---

## Container Management

### Check if container is running
```bash
docker ps --filter name=traphouse-test-db
```

### View container logs
```bash
docker logs traphouse-test-db
```

### Stop container (keep it for later)
```bash
docker stop traphouse-test-db
```

### Start stopped container
```bash
docker start traphouse-test-db
```

### Remove container completely
```bash
docker stop traphouse-test-db
docker rm traphouse-test-db
```

---

## CI/CD Integration

For automated testing in CI/CD pipelines, see `TESTING_SETUP.md` for GitHub Actions configuration.

---

## Notes

- The test database is completely isolated from your development/production databases
- Test scripts automatically clean up test data (users with "test-" in email)
- Container can be left running between test runs for faster execution
- All scripts are safe to run multiple times
