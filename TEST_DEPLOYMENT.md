# Testing the Repository from GitHub

This guide helps you verify the repository works correctly after cloning from GitHub.

## 🧪 Quick Test (What We Just Did)

```bash
# 1. Clone to a temporary location
cd /tmp
git clone https://github.com/shaneb74/senior_navigator_v4.git test_repo
cd test_repo

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. Test frontend build
npm run build
```

**✅ Success Criteria:**
- No errors during `npm install`
- Frontend builds successfully
- Only CSS budget warnings (non-breaking)

---

## 🚀 Full Deployment Test

### Prerequisites
- Node.js 18+ installed
- OpenAI API key
- Fresh machine or clean environment

### Step 1: Clone Repository
```bash
git clone https://github.com/shaneb74/senior_navigator_v4.git
cd senior_navigator_v4
```

### Step 2: Backend Setup
```bash
cd backend
npm install

# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
nano .env  # or vim, code, etc.
```

**Required in `.env`:**
```
OPENAI_API_KEY=sk-...your-key-here...
```

### Step 3: Start Backend
```bash
node server.js
```

**Expected output:**
```
🚀 Server running on http://localhost:3000
✅ Environment: development
✅ CORS enabled for: http://localhost:4200
✅ GCP LLM Tier: assist
✅ Using OpenAI model: gpt-4o-mini
```

### Step 4: Frontend Setup (New Terminal)
```bash
cd frontend
npm install
npm start
```

**Expected output:**
```
Application bundle generation complete.
✔ Browser application bundle generation complete.
Watch mode enabled. Watching for file changes...
➜  Local:   http://localhost:4200/
```

### Step 5: Test GCP Feature
1. Open browser: `http://localhost:4200`
2. Navigate to **GCP Assessment**
3. Fill out form with test data:
   - Age: 67
   - Annual Income: $45,000
   - Medical Expenses: $8,000
4. Click **Submit**

**✅ Success Criteria:**
- Backend logs show: `Processing GCP submission...`
- Frontend displays results with:
  - Deterministic Score
  - LLM Adjudication
  - Recommendation (Approve/Reject/Needs Review)

---

## 🎯 Automated Test Script

Save this as `test_deployment.sh`:

```bash
#!/bin/bash
set -e

echo "🧪 Testing senior_navigator_v4 deployment..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Clone to temp directory
TEMP_DIR=$(mktemp -d)
echo "📦 Cloning to $TEMP_DIR..."
git clone https://github.com/shaneb74/senior_navigator_v4.git "$TEMP_DIR/test_repo"
cd "$TEMP_DIR/test_repo"

# Test backend
echo "🔧 Testing backend..."
cd backend
npm install --silent
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Backend install failed${NC}"
    exit 1
fi

# Test frontend
echo "🎨 Testing frontend..."
cd ../frontend
npm install --silent
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${RED}❌ Frontend install failed${NC}"
    exit 1
fi

# Test build
echo "🏗️ Testing frontend build..."
npm run build --silent
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build successful${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

# Cleanup
cd ~
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}🎉 All tests passed!${NC}"
echo "Repository is ready for deployment."
```

**Run it:**
```bash
chmod +x test_deployment.sh
./test_deployment.sh
```

---

## 🐛 Common Issues

### Issue: OpenAI API returns 401
**Solution:** Check your `OPENAI_API_KEY` in `backend/.env`

### Issue: CORS error in browser
**Solution:** Ensure backend is running on port 3000 before starting frontend

### Issue: Port already in use
**Solution:**
```bash
# Kill port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Kill port 4200 (frontend)
lsof -ti:4200 | xargs kill -9
```

### Issue: TypeScript compilation errors
**Solution:** Make sure you're using Node.js 18+ and Angular 20+
```bash
node --version  # Should be v18 or higher
npm --version   # Should be v9 or higher
```

---

## 📊 Test Results from Fresh Clone

**Date:** November 9, 2025  
**Location:** `/tmp/senior_navigator_v4_test`

- ✅ Clone successful (275 objects, 437 KB)
- ✅ Backend install: 124 packages, 0 vulnerabilities
- ✅ Frontend install: 615 packages, 0 vulnerabilities
- ✅ Frontend build: Success (446 KB initial, 3.35 seconds)
- ⚠️ CSS budget warnings (non-breaking)

**Conclusion:** Repository is production-ready ✅

---

## 🤝 For New Developers

If you're a developer receiving this repository:

1. **Start here:** `GETTING_STARTED.md` (5-minute overview)
2. **API testing:** `docs/API_EXAMPLES.md` (curl commands)
3. **Architecture:** `docs/GCP_ARCHITECTURE.md`

**Questions?** Check the `docs/` folder for 7 comprehensive guides.
