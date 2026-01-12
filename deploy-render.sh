#!/bin/bash

# TrapHouse Kitchen - Render Deployment Helper Script
# This script helps prepare your project for Render deployment

set -e  # Exit on any error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        TrapHouse Kitchen - Render Deployment Setup        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Git repository not initialized${NC}"
    echo "Initializing git..."
    git init
    echo -e "${GREEN}✅ Git initialized${NC}"
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
    echo ""
    echo "Would you like to commit them now? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        git add .
        echo "Enter commit message:"
        read -r commit_message
        git commit -m "$commit_message"
        echo -e "${GREEN}✅ Changes committed${NC}"
    fi
fi

# Check if GitHub remote exists
if ! git remote | grep -q "origin"; then
    echo ""
    echo -e "${YELLOW}⚠️  No GitHub remote found${NC}"
    echo "Enter your GitHub repository URL (e.g., https://github.com/username/repo.git):"
    read -r github_url
    git remote add origin "$github_url"
    echo -e "${GREEN}✅ GitHub remote added${NC}"
fi

# Verify render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo -e "${RED}❌ render.yaml not found!${NC}"
    echo "This file is required for Render deployment."
    exit 1
fi
echo -e "${GREEN}✅ render.yaml found${NC}"

# Verify required directories
if [ ! -d "backend" ]; then
    echo -e "${RED}❌ backend/ directory not found!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ backend/ directory found${NC}"

if [ ! -d "frontend" ]; then
    echo -e "${RED}❌ frontend/ directory not found!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ frontend/ directory found${NC}"

# Check for .env files (should NOT be committed)
if git ls-files | grep -q "\.env$"; then
    echo -e "${RED}❌ WARNING: .env files are being tracked by git!${NC}"
    echo "You should remove them from git tracking:"
    echo "  git rm --cached backend/.env frontend/.env"
    echo "  git commit -m 'Remove .env files from tracking'"
fi

# Check for .gitignore
if [ ! -f ".gitignore" ]; then
    echo -e "${YELLOW}⚠️  .gitignore not found${NC}"
    echo "Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
package-lock.json

# Environment variables
.env
.env.local
.env.production

# Build outputs
dist/
build/

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Prisma
*.db
*.db-journal
EOF
    echo -e "${GREEN}✅ .gitignore created${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "                    Pre-Deployment Checklist"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Function to check if a command succeeded
check_command() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

# Test backend build
echo "Testing backend build..."
cd backend
npm install > /dev/null 2>&1
check_command "Backend dependencies installed"

npm run build > /dev/null 2>&1
check_command "Backend builds successfully"

cd ..

# Test frontend build
echo "Testing frontend build..."
cd frontend
npm install > /dev/null 2>&1
check_command "Frontend dependencies installed"

npm run build > /dev/null 2>&1
check_command "Frontend builds successfully"

cd ..

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "                    Ready to Deploy!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "1. Push to GitHub:"
echo "   ${YELLOW}git push -u origin main${NC}"
echo ""
echo "2. Go to Render.com:"
echo "   ${YELLOW}https://dashboard.render.com${NC}"
echo ""
echo "3. Create New Blueprint:"
echo "   • Click 'New +' → 'Blueprint'"
echo "   • Connect your GitHub repository"
echo "   • Render will detect render.yaml automatically"
echo ""
echo "4. Configure Environment Variables:"
echo "   • STRIPE_SECRET_KEY"
echo "   • STRIPE_PUBLISHABLE_KEY"
echo "   • VITE_STRIPE_PUBLISHABLE_KEY"
echo "   • RESEND_API_KEY (optional)"
echo "   • CHEF_EMAIL (optional)"
echo ""
echo "5. Deploy!"
echo ""
echo "📖 Full guide: RENDER_DEPLOYMENT_GUIDE.md"
echo ""
echo -e "${GREEN}🚀 Good luck with your deployment!${NC}"
