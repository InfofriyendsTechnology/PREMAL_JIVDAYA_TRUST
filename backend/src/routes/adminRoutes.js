import express from 'express';
import ExcelJS from 'exceljs';
import Submission from '../models/Submission.js';
import Settings from '../models/Settings.js';

const router = express.Router();

// Simple password guard middleware
const adminAuth = (req, res, next) => {
  const pass = req.headers['x-admin-password'] || req.query.password;
  if (!pass || pass !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// GET /api/admin/submissions — all records
router.get('/submissions', adminAuth, async (req, res) => {
  try {
    const submissions = await Submission.find().sort({ createdAt: -1 });
    res.json({ total: submissions.length, submissions });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/export — download Excel file
router.get('/export', adminAuth, async (req, res) => {
  try {
    const submissions = await Submission.find().sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Premal Jivdaya Trust';
    const sheet = workbook.addWorksheet('Poster Downloads');

    sheet.columns = [
      { header: 'Sr.No',      key: 'sr',        width: 8  },
      { header: 'First Name', key: 'firstName',  width: 22 },
      { header: 'Last Name',  key: 'lastName',   width: 22 },
      { header: 'Phone',      key: 'phone',      width: 18 },
      { header: 'Date & Time',key: 'createdAt',  width: 26 },
    ];

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B1A6E' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.getRow(1).height = 24;

    // Data rows
    submissions.forEach((s, i) => {
      const row = sheet.addRow({
        sr:        i + 1,
        firstName: s.firstName,
        lastName:  s.lastName,
        phone:     s.phone,
        createdAt: new Date(s.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      });
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      if (i % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=premal_jivdaya_posters.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/submissions/:id — delete one record
router.delete('/submissions/:id', adminAuth, async (req, res) => {
  try {
    const deleted = await Submission.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Record not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/submissions — delete ALL records
router.delete('/submissions', adminAuth, async (req, res) => {
  try {
    await Submission.deleteMany({});
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Layout Settings ──────────────────────────────────────────────
const DEFAULT_LAYOUT = {
  photoLeft: 0.022, photoTop: 0.148, photoWidth: 0.308, photoHeight: 0.515,
  nameCX: 0.528, nameCY: 0.598, nameFontPct: 0.025, maxName: 18,
};

// GET /api/admin/settings — public (PosterMaker fetches this to get current layout)
router.get('/settings', async (req, res) => {
  try {
    const s = await Settings.findOne({ key: 'poster_layout' });
    res.json(s ? {
      photoLeft:   s.photoLeft,
      photoTop:    s.photoTop,
      photoWidth:  s.photoWidth,
      photoHeight: s.photoHeight,
      nameCX:      s.nameCX,
      nameCY:      s.nameCY,
      nameFontPct: s.nameFontPct,
      maxName:     s.maxName,
    } : DEFAULT_LAYOUT);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/settings — admin auth required
router.put('/settings', adminAuth, async (req, res) => {
  try {
    const { photoLeft, photoTop, photoWidth, photoHeight, nameCX, nameCY, nameFontPct, maxName } = req.body;
    const s = await Settings.findOneAndUpdate(
      { key: 'poster_layout' },
      { photoLeft, photoTop, photoWidth, photoHeight, nameCX, nameCY, nameFontPct, maxName },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({
      photoLeft:   s.photoLeft,
      photoTop:    s.photoTop,
      photoWidth:  s.photoWidth,
      photoHeight: s.photoHeight,
      nameCX:      s.nameCX,
      nameCY:      s.nameCY,
      nameFontPct: s.nameFontPct,
      maxName:     s.maxName,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
