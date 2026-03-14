import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from '../src/db.js';
import posterRoutes from '../src/routes/posterRoutes.js';
import adminRoutes from '../src/routes/adminRoutes.js';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.use('/api', posterRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Initialize DB and start server
connectDB().then(() => {
    console.log('✅ Database connected for API route');
}).catch((err) => {
    console.error('❌ Database connection failed:', err.message);
});

export default app;
