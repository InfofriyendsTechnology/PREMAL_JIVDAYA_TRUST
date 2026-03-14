import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './db.js';
import posterRoutes from './routes/posterRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-password']
};

app.use(cors(corsOptions));
app.use(express.json());

// Root health check (main path)
app.get('/', (_, res) => res.json({ status: 'ok', message: 'API is running' }));

// Health endpoint
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api', posterRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: 'Server error', message: err.message });
});

// Initialize DB
connectDB().catch(err => {
  console.warn('⚠️ Database warning:', err.message);
});

// For local development
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ CORS enabled for:`, corsOptions.origin);
});

// Export for Vercel serverless
export default app;
