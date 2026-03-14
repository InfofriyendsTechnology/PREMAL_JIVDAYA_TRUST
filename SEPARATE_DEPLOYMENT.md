# 🚀 Deployment Guide - Separate Frontend & Backend

## Deploy Frontend (Vercel)

### Step 1: Create Frontend Repository
```bash
cd frontend
git init
git add .
git commit -m "Initial commit: Frontend"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/premal-jivdaya-frontend.git
git push -u origin main
```

### Step 2: Deploy Frontend on Vercel
1. Go to https://vercel.com
2. Click "Import Project"
3. Select your frontend repository
4. **Root Directory:** `./` (or leave empty)
5. **Build Command:** `npm run build`
6. **Output Directory:** `dist`
7. Click "Deploy"
8. Get frontend URL: `https://premal-jivdaya-frontend.vercel.app`

---

## Deploy Backend (Render / Railway / Vercel)

### Option A: Deploy on Render (Recommended for Node.js APIs)

**Step 1: Push Backend to GitHub**
```bash
cd backend
git init
git add .
git commit -m "Initial commit: Backend API"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/premal-jivdaya-backend.git
git push -u origin main
```

**Step 2: Deploy on Render**
1. Go to https://render.com
2. Click "New+" → "Web Service"
3. Select your backend repository
4. **Name:** `premal-jivdaya-backend`
5. **Environment:** `Node`
6. **Build Command:** `npm install`
7. **Start Command:** `node src/server.js`
8. **Environment Variables:**
   - `MONGODB_URI` = your_mongodb_url
   - `ADMIN_PASSWORD` = your_password
   - `FRONTEND_URL` = https://premal-jivdaya-frontend.vercel.app
   - `NODE_ENV` = production
9. Click "Create Web Service"
10. Get backend URL: `https://premal-jivdaya-backend.onrender.com`

---

## Update Frontend to Use Backend URL

After backend is deployed, update frontend API calls:

**File:** `frontend/src/main.jsx` or axios config:

```javascript
const API_BASE = process.env.VITE_API_URL || 'https://premal-jivdaya-backend.onrender.com';
```

Or add to `.env.production`:
```
VITE_API_URL=https://premal-jivdaya-backend.onrender.com
```

---

## Verify Deployment

**Frontend:**
```
https://premal-jivdaya-frontend.vercel.app
```

**Backend:**
```
https://premal-jivdaya-backend.onrender.com/api/health
```

Response: `{"status":"ok"}`

---

## Project Structure

```
GitHub:
├── premal-jivdaya-frontend (separate repo)
│   └── frontend/ contents
│
└── premal-jivdaya-backend (separate repo)
    └── backend/ contents
```

**Deployment:**
- Frontend → Vercel
- Backend → Render
- Database → MongoDB Atlas

---

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=https://premal-jivdaya-backend.onrender.com
```

### Backend (.env)
```
MONGODB_URI=mongodb+srv://...
ADMIN_PASSWORD=your_password
FRONTEND_URL=https://premal-jivdaya-frontend.vercel.app
NODE_ENV=production
PORT=3000
```

---

## Auto-Deploy on Push

Both Vercel and Render auto-deploy when you push to main branch! 🎯
