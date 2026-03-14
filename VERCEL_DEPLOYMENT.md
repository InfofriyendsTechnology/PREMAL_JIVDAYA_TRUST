# Vercel Deployment Guide - Premal Jivdaya Trust Poster Maker

## Setup Instructions

### 1. **Push to GitHub**
```bash
cd c:\Users\dell i7\Desktop\project\PREMAL_JIVDAYA_TRUST
git init
git add .
git commit -m "Initial commit: Poster Maker App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/PREMAL_JIVDAYA_TRUST.git
git push -u origin main
```

### 2. **Create Vercel Account**
- Go to https://vercel.com
- Sign up with GitHub
- Import this repository

### 3. **Configure Environment Variables in Vercel**
In Vercel Dashboard → Settings → Environment Variables, add:

```
MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/premal_jivdaya
ADMIN_PASSWORD = your_secure_password
FRONTEND_URL = https://your-project-name.vercel.app
NODE_ENV = production
```

### 4. **Deploy**
After pushing to GitHub, Vercel will automatically:
- ✅ Build frontend with Vite
- ✅ Set up backend API routes
- ✅ Deploy both frontend & backend

### 5. **Verify Deployment**
- Frontend: `https://your-project-name.vercel.app`
- API: `https://your-project-name.vercel.app/api/health`
- Admin: `https://your-project-name.vercel.app/admin`

## File Structure for Vercel

```
PREMAL_JIVDAYA_TRUST/
├── vercel.json           # Vercel deployment config
├── .vercelignore         # Files to ignore
├── .env.example          # Environment template
├── frontend/
│   ├── package.json
│   ├── index.html
│   └── src/
└── backend/
    ├── package.json
    ├── api/
    │   └── index.js      # Serverless API handler
    └── src/
```

## API Routes on Vercel

- `POST /api/log` - Save poster download
- `GET /api/admin/submissions` - Get all submissions
- `GET /api/admin/export` - Export to Excel
- `GET /api/health` - Health check

## Important Notes

1. **Environment Variables**: Never commit `.env` file
2. **Database**: Ensure MongoDB allows Vercel IPs in Network Access
3. **CORS**: FRONTEND_URL must match your Vercel domain
4. **Build Time**: First deploy may take 2-3 minutes

## Troubleshooting

### Database Connection Error
- Check `MONGODB_URI` in Vercel settings
- Verify Vercel IP is whitelisted in MongoDB Atlas

### CORS Issues
- Update `FRONTEND_URL` in environment variables
- Clear browser cache and redeploy

### Build Fails
- Check `frontend/package.json` dependencies
- Ensure all imports are correct
- Review Vercel build logs

## Quick Reference

**Redeploy:** Push to main branch on GitHub
**View Logs:** Vercel Dashboard → Deployments → Function Logs
**Rollback:** Vercel Dashboard → Deployments → Select previous version
