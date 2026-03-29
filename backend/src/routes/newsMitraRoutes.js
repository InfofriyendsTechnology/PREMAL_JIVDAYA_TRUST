import express from 'express';
import Settings from '../models/Settings.js';

const router = express.Router();

const DEFAULT = {
  captionX: 0.500, captionY: 0.205,
  captionFontPct: 0.038, captionMaxWidth: 0.800,
  videoLeft: 0.060, videoTop: 0.268,
  videoWidth: 0.866, videoHeight: 0.600,
  logoX: 0.782, logoY: 0.157, logoSize: 0.120,
};

const adminAuth = (req, res, next) => {
  const pass = req.headers['x-admin-password'] || req.query.password;
  if (!pass || pass !== '123') return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// GET /api/newsmitra/settings — public
router.get('/settings', async (req, res) => {
  try {
    const s = await Settings.findOne({ key: 'newsmitra_layout' });
    res.json(s ? {
      captionX: s.captionX, captionY: s.captionY,
      captionFontPct: s.captionFontPct, captionMaxWidth: s.captionMaxWidth,
      videoLeft: s.videoLeft, videoTop: s.videoTop,
      videoWidth: s.videoWidth, videoHeight: s.videoHeight,
    } : DEFAULT);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/newsmitra/auth — admin test
router.get('/auth', adminAuth, (req, res) => res.json({ ok: true }));

// PUT /api/newsmitra/settings — admin only
router.put('/settings', adminAuth, async (req, res) => {
  try {
    const fields = ['captionX','captionY','captionFontPct','captionMaxWidth',
                    'videoLeft','videoTop','videoWidth','videoHeight',
                    'logoX','logoY','logoSize'];
    const update = {};
    fields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    const s = await Settings.findOneAndUpdate(
      { key: 'newsmitra_layout' }, update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(update);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

export default router;
