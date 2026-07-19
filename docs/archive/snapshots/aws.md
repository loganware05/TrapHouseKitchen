# AWS ECR Deployment Guide

Deploy TrapHouse Kitchen to AWS Elastic Container Registry (ECR) and ECS.

---

## Prerequisites

- AWS account
- AWS CLI installed and configured
- Docker installed locally
- Code repository ready

---

## Quick Deployment

### Step 1: Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name traphouse-kitchen \
  --region us-east-1
```

### Step 2: Configure Environment

```bash
export AWS_REGION=us-east-1
export ECR_REPOSITORY=traphouse-kitchen
```

### Step 3: Run Deployment Script

```bash
chmod +x scripts/deploy-ecr.sh
./scripts/deploy-ecr.sh v1.0.0
```

The script will:
- Log in to AWS ECR
- Build the Docker image
- Tag the image
- Push to ECR
- Output the image URI for deployment

---

## Manual Deployment Steps

### 1. Authenticate with ECR

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

### 2. Build Docker Image

```bash
docker build -t traphouse-kitchen .
```

### 3. Tag Image

```bash
docker tag traphouse-kitchen:latest \
  YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/traphouse-kitchen:latest
```

### 4. Push to ECR

```bash
docker push YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/traphouse-kitchen:latest
```

---

## Using the Image with ECS

### Create Task Definition

Use the image URI from ECR in your ECS task definition:

```json
{
  "family": "traphouse-kitchen",
  "containerDefinitions": [
    {
      "name": "traphouse-kitchen",
      "image": "YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/traphouse-kitchen:latest",
      "essential": true,
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
        }
      ]
    }
  ]
}
```

---

## Environment Variables

Set environment variables in ECS task definition or use AWS Secrets Manager.

---

## Support

For AWS-specific issues:
- **AWS Docs:** [aws.amazon.com/documentation](https://aws.amazon.com/documentation)
- **ECR Guide:** [docs.aws.amazon.com/ecr](https://docs.aws.amazon.com/ecr)
- **ECS Guide:** [docs.aws.amazon.com/ecs](https://docs.aws.amazon.com/ecs)
