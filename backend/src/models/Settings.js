import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'poster_layout', unique: true },

    // ── Premal Jivdaya layout ──────────────────────────────────
    photoLeft:   { type: Number, default: 0.022 },
    photoTop:    { type: Number, default: 0.148 },
    photoWidth:  { type: Number, default: 0.308 },
    photoHeight: { type: Number, default: 0.515 },
    nameCX:      { type: Number, default: 0.528 },
    nameCY:      { type: Number, default: 0.598 },
    nameFontPct: { type: Number, default: 0.025 },
    maxName:     { type: Number, default: 18 },

    // ── News Mitra layout ──────────────────────────────────────
    captionX:        { type: Number, default: 0.500 },
    captionY:        { type: Number, default: 0.205 },
    captionFontPct:  { type: Number, default: 0.038 },
    captionMaxWidth: { type: Number, default: 0.800 },
    videoLeft:   { type: Number, default: 0.060 },
    videoTop:    { type: Number, default: 0.268 },
    videoWidth:  { type: Number, default: 0.866 },
    videoHeight: { type: Number, default: 0.600 },
    logoX:   { type: Number, default: 0.782 },
    logoY:   { type: Number, default: 0.157 },
    logoSize:{ type: Number, default: 0.120 },

    // ── Nand Utsav layout ──────────────────────────────────────
    nuFrameCX:     { type: Number, default: 0.705 },
    nuFrameCY:     { type: Number, default: 0.645 },
    nuFrameR:      { type: Number, default: 0.155 },
    nuNameCX:      { type: Number, default: 0.30 },
    nuNameCY:      { type: Number, default: 0.775 },
    nuNameFontPct: { type: Number, default: 0.025 },
    nuMaxName:     { type: Number, default: 18 },

    // ── Rukmani Vivah layout ───────────────────────────────────
    rvFrameCX:     { type: Number, default: 0.22 },
    rvFrameCY:     { type: Number, default: 0.69 },
    rvFrameR:      { type: Number, default: 0.17 },
    rvNameCX:      { type: Number, default: 0.70 },
    rvNameCY:      { type: Number, default: 0.84 },
    rvNameFontPct: { type: Number, default: 0.025 },
    rvMaxName:     { type: Number, default: 18 },
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
