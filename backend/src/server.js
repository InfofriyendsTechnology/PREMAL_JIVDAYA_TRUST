import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './db.js';
import posterRoutes from './routes/posterRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Root health check (main path)
app.get('/', (_, res) => res.json({ status: 'ok', message: 'API is running' }));

// Health endpoint
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api', posterRoutes);
app.use('/api/admin', adminRoutes);

// Initialize DB
connectDB().catch(err => {
  console.warn('⚠️ Database warning:', err.message);
});

// For local development
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

// Export for Vercel serverless
export default app;
