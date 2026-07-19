#!/bin/bash

# Build and Push to AWS ECR Script
# Usage: ./deploy-ecr.sh [tag]

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPOSITORY="${ECR_REPOSITORY:-traphouse-kitchen}"
TAG="${1:-latest}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "❌ Failed to get AWS account ID. Please configure AWS credentials."
    exit 1
fi

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"

echo "🔐 Logging in to AWS ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

echo "🏗️  Building Docker image..."
docker build -t ${ECR_REPOSITORY}:${TAG} .

echo "🏷️  Tagging image for ECR..."
docker tag ${ECR_REPOSITORY}:${TAG} ${ECR_URI}:${TAG}
docker tag ${ECR_REPOSITORY}:${TAG} ${ECR_URI}:latest

echo "📤 Pushing image to ECR..."
docker push ${ECR_URI}:${TAG}
docker push ${ECR_URI}:latest

echo "✅ Successfully pushed to ECR!"
echo "📦 Image URI: ${ECR_URI}:${TAG}"
echo ""
echo "🚀 To deploy, use the following image URI:"
echo "   ${ECR_URI}:${TAG}"

