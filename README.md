# Premal Jivdaya Trust - Poster Maker

Full-stack MERN application with PWA support, deployed on Vercel.

## 🚀 Quick Start

### Development

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
cd backend
npm install
npm run dev
```

### Environment Setup

Copy `.env.example` to `.env` in both directories:

```bash
cp .env.example .env
```

Fill in your actual values:
- MongoDB URI
- Admin password
- Frontend URL

## 📦 Tech Stack

- **Frontend:** React 18 + Vite + PWA
- **Backend:** Express.js + MongoDB + Mongoose
- **Deployment:** Vercel
- **Database:** MongoDB Atlas

## 🗂️ Project Structure

```
PREMAL_JIVDAYA_TRUST/
├── frontend/              # React Vite app
│   ├── public/
│   │   ├── logo.jpg      # Official logo & favicon
│   │   ├── template.png  # Poster template
│   │   └── manifest.json # PWA manifest
│   └── src/
├── backend/              # Express API
│   ├── src/
│   │   ├── server.js
│   │   ├── models/       # Mongoose schemas
│   │   └── routes/       # API routes
│   └── api/
│       └── index.js      # Vercel serverless handler
├── vercel.json           # Vercel config
├── .env.example          # Environment template
└── README.md
```

## 🌐 Vercel Deployment

See `VERCEL_DEPLOYMENT.md` for detailed setup instructions.

Quick deploy:
1. Push to GitHub
2. Import repo in Vercel
3. Add environment variables
4. Done! Auto-deploys on push

## 📱 Features

- ✅ Create personalized posters with photo & name
- ✅ Offline-first PWA (works without internet)
- ✅ Admin dashboard for submissions
- ✅ Excel export functionality
- ✅ Mobile responsive design
- ✅ Official Premal Jivdaya branding

## 🔗 API Endpoints

### Poster Routes
- `POST /api/log` - Save poster download submission

### Admin Routes
- `GET /api/admin/submissions` - Fetch all submissions
- `GET /api/admin/export` - Download Excel file
- `GET /api/admin/settings` - Get layout settings
- `POST /api/admin/settings` - Update layout settings

All admin routes require `x-admin-password` header.

## 🛠️ Development Scripts

**Frontend:**
```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview build
```

**Backend:**
```bash
npm run dev      # Start with nodemon
npm start        # Production start
```

## 🔐 Security

- Admin routes protected with password header
- Environment variables for sensitive data
- CORS configured for specific origin

## 📄 License

Created with ❤️ for Premal Jivdaya Trust

