import express from 'express';
import Submission from '../models/Submission.js';

const router = express.Router();

// POST /api/log — called when user downloads a poster
router.post('/log', async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    if (!firstName || !lastName || !phone) {
      return res.status(400).json({ error: 'firstName, lastName and phone are required' });
    }
    const submission = await Submission.create({ firstName, lastName, phone });
    res.status(201).json({ success: true, id: submission._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
