# 🐙 GitHub Setup Guide - TrapHouse Kitchen

Quick guide to push your code to GitHub for Render deployment.

---

## 📋 **Prerequisites**

- [ ] GitHub account (create at [github.com](https://github.com))
- [ ] Git installed locally
- [ ] Project ready for deployment

---

## 🚀 **Quick Setup (5 Minutes)**

### **Step 1: Create GitHub Repository**

1. **Go to GitHub:**
   - Visit [github.com/new](https://github.com/new)
   - Or click "+" in top right → "New repository"

2. **Repository Details:**
   - **Name:** `traphouse-kitchen` (or your preferred name)
   - **Description:** "TrapHouse Kitchen - Restaurant ordering system with Stripe payments"
   - **Visibility:** Choose "Private" (recommended) or "Public"
   - **DON'T** initialize with README, .gitignore, or license (we have these already)

3. **Click "Create repository"**

### **Step 2: Push Your Code**

Open terminal in your project directory and run:

```bash
# Navigate to project
cd "/Users/loganware/Documents/Buisness/TrapHouseKitchen v2"

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Production ready"

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/traphouse-kitchen.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Example:**
```bash
# If your GitHub username is "johnsmith"
git remote add origin https://github.com/johnsmith/traphouse-kitchen.git
git push -u origin main
```

### **Step 3: Verify Upload**

1. Go to your repository on GitHub
2. Verify these files are present:
   - ✅ `render.yaml`
   - ✅ `backend/` directory
   - ✅ `frontend/` directory
   - ✅ `README.md`
   - ✅ `.gitignore`

3. Verify these files are **NOT** present (they should be ignored):
   - ❌ `.env` (backend or frontend)
   - ❌ `node_modules/`
   - ❌ `dist/` or `build/`

---

## 🔐 **Security Check**

### **CRITICAL: Ensure No Secrets Are Committed**

Before pushing, verify `.gitignore` includes:

```gitignore
# Environment variables
.env
.env.local
.env.production
.env.*.local

# Dependencies
node_modules/
package-lock.json

# Build outputs
dist/
build/
```

### **If You Accidentally Committed .env:**

```bash
# Remove from git tracking
git rm --cached backend/.env
git rm --cached frontend/.env

# Commit the removal
git commit -m "Remove .env files from tracking"

# Push
git push origin main
```

**⚠️ IMPORTANT:** If you pushed secrets to GitHub, you must:
1. Rotate all API keys immediately (Stripe, Resend, etc.)
2. Generate new JWT secret
3. Update environment variables in Render

---

## 🔄 **Future Updates**

### **Making Changes:**

```bash
# Make your code changes
# Then commit and push:

git add .
git commit -m "Description of changes"
git push origin main
```

**Render will automatically deploy when you push to `main` branch!**

### **Creating Branches:**

For safer development:

```bash
# Create a development branch
git checkout -b development

# Make changes, then:
git add .
git commit -m "New feature"
git push origin development

# Later, merge to main via GitHub Pull Request
```

---

## 🎯 **Alternative: Using GitHub Desktop**

If you prefer a GUI:

1. **Download GitHub Desktop:**
   - Visit [desktop.github.com](https://desktop.github.com)
   - Install the application

2. **Add Repository:**
   - Open GitHub Desktop
   - File → Add Local Repository
   - Choose your project folder

3. **Publish to GitHub:**
   - Click "Publish repository"
   - Choose name and visibility
   - Click "Publish repository"

4. **Future Updates:**
   - Make changes in your code
   - GitHub Desktop shows changes
   - Write commit message
   - Click "Commit to main"
   - Click "Push origin"

---

## 🔗 **SSH Key Setup (Optional)**

For easier authentication without passwords:

### **Generate SSH Key:**

```bash
# Check if you already have SSH keys
ls -al ~/.ssh

# Generate new SSH key (if needed)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Press Enter to accept defaults
# Add a passphrase (recommended)

# Start SSH agent
eval "$(ssh-agent -s)"

# Add SSH key
ssh-add ~/.ssh/id_ed25519
```

### **Add to GitHub:**

```bash
# Copy public key to clipboard (macOS)
pbcopy < ~/.ssh/id_ed25519.pub

# Or display it
cat ~/.ssh/id_ed25519.pub
```

1. Go to [github.com/settings/keys](https://github.com/settings/keys)
2. Click "New SSH key"
3. Paste your public key
4. Click "Add SSH key"

### **Update Remote URL:**

```bash
# Change from HTTPS to SSH
git remote set-url origin git@github.com:YOUR_USERNAME/traphouse-kitchen.git
```

---

## 🐛 **Troubleshooting**

### **"remote origin already exists"**

```bash
# Remove existing remote
git remote remove origin

# Add new remote
git remote add origin https://github.com/YOUR_USERNAME/traphouse-kitchen.git
```

### **"failed to push some refs"**

```bash
# Pull first (if repository has changes)
git pull origin main --allow-unrelated-histories

# Then push
git push origin main
```

### **"Permission denied (publickey)"**

Either:
1. Use HTTPS URL instead of SSH
2. Set up SSH keys (see SSH section above)

```bash
# Switch to HTTPS
git remote set-url origin https://github.com/YOUR_USERNAME/traphouse-kitchen.git
```

### **"git is not recognized"**

Install Git:
- macOS: `brew install git`
- Windows: Download from [git-scm.com](https://git-scm.com)
- Linux: `sudo apt install git` or `sudo yum install git`

---

## ✅ **Verification Checklist**

Before deploying to Render:

- [ ] Code pushed to GitHub
- [ ] `render.yaml` in repository root
- [ ] No `.env` files committed
- [ ] No `node_modules/` committed
- [ ] Repository is accessible (not deleted/archived)
- [ ] Using `main` branch (or adjust render.yaml)

---

## 📚 **Git Commands Reference**

```bash
# Check status
git status

# View changes
git diff

# Add specific files
git add file1.js file2.js

# Add all changes
git add .

# Commit with message
git commit -m "Your message"

# Push to GitHub
git push origin main

# Pull latest changes
git pull origin main

# View commit history
git log

# Create new branch
git checkout -b branch-name

# Switch branches
git checkout branch-name

# View all branches
git branch -a

# Delete branch
git branch -d branch-name
```

---

## 🎓 **Git Best Practices**

### **Commit Messages:**

Good:
- ✅ "Add Stripe payment integration"
- ✅ "Fix chef dashboard redirect issue"
- ✅ "Update order confirmation email template"

Bad:
- ❌ "Update"
- ❌ "Fix bug"
- ❌ "Changes"

### **Commit Frequency:**

- Commit related changes together
- Don't commit broken code
- Commit before major refactoring
- Commit after completing a feature

### **Branch Strategy:**

```
main          → Production-ready code
development   → Active development
feature/...   → New features
fix/...       → Bug fixes
```

---

## 🚀 **Next Steps**

After pushing to GitHub:

1. ✅ **Verify on GitHub.com** - Check all files are there
2. ✅ **Copy Repository URL** - You'll need it for Render
3. ✅ **Go to Render** - Follow `RENDER_DEPLOYMENT_GUIDE.md`
4. ✅ **Connect Repository** - Render will auto-detect `render.yaml`

---

## 📞 **Need Help?**

**GitHub Support:**
- Documentation: [docs.github.com](https://docs.github.com)
- Support: [support.github.com](https://support.github.com)

**Git Help:**
- Git documentation: [git-scm.com/doc](https://git-scm.com/doc)
- Git tutorial: [try.github.io](https://try.github.io)

**Common Issues:**
- Check `RENDER_DEPLOYMENT_GUIDE.md` troubleshooting section
- Search GitHub Community: [github.community](https://github.community)

---

**Ready to deploy? Continue to `RENDER_DEPLOYMENT_GUIDE.md`! 🚀**
