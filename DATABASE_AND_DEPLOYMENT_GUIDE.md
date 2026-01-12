# TrapHouse Kitchen - Database & Deployment Guide

## 🔧 Part 1: Fix Backend Database Connection

### **Root Cause**
The Prisma client is generated correctly, but it can't find `DATABASE_URL` at runtime because:
1. The generated client is looking for the env var but not finding it
2. The .env file exists but isn't being read by the Prisma client

### **Solution: Use Direct Database URL**

**Option A: Quick Fix (Recommended for Development)**

1. **Update Prisma Client Initialization:**

```typescript
// backend/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://traphouse:traphouse_dev_password@localhost:5432/traphouse_kitchen?schema=public'
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
```

2. **Restart Backend:**
```bash
cd backend
npm run dev
```

**Option B: Docker Compose (Production-like)**

Use the provided docker-compose.yml to run everything:

```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Wait for DB to be ready
sleep 5

# Run migrations
cd backend
npx prisma migrate deploy

# Start backend
npm run dev
```

---

## 📊 Part 2: Verify Database Connection

### **Test Commands:**

```bash
# 1. Check if PostgreSQL is accessible
psql -h localhost -U traphouse -d traphouse_kitchen -c "SELECT version();"
# Password: traphouse_dev_password

# 2. Test backend API
curl http://localhost:3001/api/categories

# 3. Expected response (should show categories, not error)
# {"status":"success","data":{"categories":[...]}}
```

---

## 🚀 Part 3: Deploy to AWS ECR

### **Prerequisites:**
```bash
# Install AWS CLI
brew install awscli  # macOS
# or download from: https://aws.amazon.com/cli/

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (e.g., us-east-1)
```

### **Step 1: Create ECR Repository**

```bash
# Set variables
export AWS_REGION=us-east-1
export ECR_REPOSITORY=traphouse-kitchen

# Create repository
aws ecr create-repository \
    --repository-name $ECR_REPOSITORY \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true

# Note the repositoryUri from the output
```

### **Step 2: Build and Push Docker Image**

**Using the provided script:**

```bash
# Make script executable
chmod +x deploy-ecr.sh

# Set environment variables (if not already set)
export AWS_REGION=us-east-1
export ECR_REPOSITORY=traphouse-kitchen

# Run deployment
./deploy-ecr.sh v1.0.0
```

**Manual steps (if script doesn't work):**

```bash
# 1. Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# 2. Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
    docker login --username AWS --password-stdin \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# 3. Build image
docker build -t traphouse-kitchen:v1.0.0 .

# 4. Tag for ECR
docker tag traphouse-kitchen:v1.0.0 \
    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/traphouse-kitchen:v1.0.0

# 5. Push to ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/traphouse-kitchen:v1.0.0
```

### **Step 3: Deploy to AWS (Choose one)**

#### **Option A: AWS ECS (Elastic Container Service)**

1. **Create ECS Cluster:**
```bash
aws ecs create-cluster --cluster-name traphouse-cluster --region $AWS_REGION
```

2. **Create Task Definition:**
Create file `ecs-task-definition.json`:
```json
{
  "family": "traphouse-kitchen",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "traphouse-app",
      "image": "YOUR_ECR_URI:v1.0.0",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3001"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:db-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:jwt-secret"
        }
      ]
    }
  ]
}
```

3. **Register Task Definition:**
```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

4. **Create Service:**
```bash
aws ecs create-service \
    --cluster traphouse-cluster \
    --service-name traphouse-service \
    --task-definition traphouse-kitchen \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

#### **Option B: AWS App Runner (Simpler)**

1. **Create App Runner service:**
```bash
aws apprunner create-service \
    --service-name traphouse-kitchen \
    --source-configuration '{
        "ImageRepository": {
            "ImageIdentifier": "YOUR_ECR_URI:v1.0.0",
            "ImageRepositoryType": "ECR",
            "ImageConfiguration": {
                "Port": "3001",
                "RuntimeEnvironmentVariables": {
                    "NODE_ENV": "production"
                }
            }
        },
        "AutoDeploymentsEnabled": true
    }' \
    --instance-configuration '{
        "Cpu": "1 vCPU",
        "Memory": "2 GB"
    }'
```

#### **Option C: AWS Lightsail (Easiest for Small Apps)**

```bash
# Push container to Lightsail
aws lightsail create-container-service \
    --service-name traphouse-kitchen \
    --power small \
    --scale 1

# Deploy container
aws lightsail create-container-service-deployment \
    --service-name traphouse-kitchen \
    --containers '{
        "app": {
            "image": "YOUR_ECR_URI:v1.0.0",
            "ports": {
                "3001": "HTTP"
            }
        }
    }' \
    --public-endpoint '{
        "containerName": "app",
        "containerPort": 3001,
        "healthCheck": {
            "path": "/health"
        }
    }'
```

---

## 🗄️ Part 4: Setup Production Database

### **Option A: AWS RDS (Recommended)**

```bash
# Create PostgreSQL RDS instance
aws rds create-db-instance \
    --db-instance-identifier traphouse-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 16.1 \
    --master-username traphouse \
    --master-user-password YOUR_SECURE_PASSWORD \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-xxx \
    --db-name traphouse_kitchen \
    --backup-retention-period 7 \
    --publicly-accessible
```

### **Option B: Railway (Quick & Easy)**

1. Go to https://railway.app
2. Create new project → PostgreSQL
3. Copy the DATABASE_URL
4. Add to your AWS Secrets Manager or ECS environment variables

### **Option C: Supabase (Free PostgreSQL)**

1. Go to https://supabase.com
2. Create new project
3. Get connection string from Settings → Database
4. Use in your application

---

## 🔐 Part 5: Secure Secrets Management

### **Store secrets in AWS Secrets Manager:**

```bash
# Store DATABASE_URL
aws secretsmanager create-secret \
    --name traphouse/database-url \
    --secret-string "postgresql://user:pass@host:5432/db"

# Store JWT_SECRET
aws secretsmanager create-secret \
    --name traphouse/jwt-secret \
    --secret-string "$(openssl rand -base64 32)"

# Get secret ARNs for ECS task definition
aws secretsmanager describe-secret --secret-id traphouse/database-url
```

---

## 📝 Part 6: Environment Variables Checklist

### **Required for Production:**

```env
# Database
DATABASE_URL=postgresql://user:pass@prod-db-host:5432/traphouse_kitchen

# Authentication
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=production

# Frontend URL (for CORS)
FRONTEND_URL=https://your-domain.com
```

---

## ✅ Part 7: Deployment Checklist

- [ ] AWS account created and configured
- [ ] AWS CLI installed and authenticated
- [ ] ECR repository created
- [ ] Docker image built and tested locally
- [ ] Image pushed to ECR
- [ ] Production database created (RDS/Railway/Supabase)
- [ ] Secrets stored in AWS Secrets Manager
- [ ] ECS/App Runner service created
- [ ] Environment variables configured
- [ ] Health check endpoint working
- [ ] Domain configured (optional)
- [ ] SSL certificate added (optional)

---

## 🧪 Part 8: Testing Production Deployment

```bash
# 1. Get service URL (depends on deployment method)
# For App Runner:
aws apprunner describe-service --service-arn YOUR_ARN

# For ECS with ALB:
aws elbv2 describe-load-balancers

# 2. Test health endpoint
curl https://your-service-url/health

# 3. Test API endpoint
curl https://your-service-url/api/categories

# 4. Test frontend (if deployed)
curl https://your-service-url/
```

---

## 🔄 Part 9: CI/CD with GitHub Actions

The `.github/workflows/deploy.yml` file is already configured!

**To enable:**

1. Add secrets to GitHub repository:
   - Settings → Secrets and variables → Actions
   - Add: `AWS_ACCESS_KEY_ID`
   - Add: `AWS_SECRET_ACCESS_KEY`

2. Push to main branch:
```bash
git push origin main
```

3. GitHub Actions will automatically:
   - Run tests
   - Build Docker image
   - Push to ECR
   - Deploy to ECS (if configured)

---

## 📊 Quick Start Commands Summary

```bash
# 1. Fix Database Locally
cd backend
# Update src/lib/prisma.ts with direct URL
npm run dev

# 2. Test Everything Works
curl http://localhost:3001/api/categories

# 3. Build Docker Image
docker build -t traphouse-kitchen:local .

# 4. Deploy to AWS ECR
./deploy-ecr.sh v1.0.0

# 5. Create Database on AWS/Railway/Supabase
# (Use web console or CLI)

# 6. Deploy Container to AWS
# (Use ECS/App Runner/Lightsail commands above)
```

---

## 🆘 Troubleshooting

### **Database Connection Issues:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test connection
psql -h localhost -U traphouse -d traphouse_kitchen

# Check Prisma client
cd backend && npx prisma studio
```

### **ECR Push Issues:**
```bash
# Re-authenticate
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Check repository exists
aws ecr describe-repositories
```

### **Container Won't Start:**
```bash
# Check logs (ECS)
aws ecs describe-tasks --cluster traphouse-cluster --tasks TASK_ARN

# Check logs (CloudWatch)
aws logs tail /ecs/traphouse-kitchen --follow
```

---

## 📞 Next Steps

1. **Immediate:** Fix database connection using Option A
2. **Short-term:** Test all features locally
3. **Medium-term:** Deploy to AWS ECR
4. **Long-term:** Set up CI/CD pipeline

---

**Need help? Check:**
- AWS Documentation: https://docs.aws.amazon.com
- Prisma Docs: https://www.prisma.io/docs
- Docker Docs: https://docs.docker.com

