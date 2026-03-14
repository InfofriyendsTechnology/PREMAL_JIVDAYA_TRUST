import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'poster_layout', unique: true },

    // Photo frame position (fractions of canvas width / height)
    photoLeft:   { type: Number, default: 0.022 },
    photoTop:    { type: Number, default: 0.148 },
    photoWidth:  { type: Number, default: 0.308 },
    photoHeight: { type: Number, default: 0.515 },

    // Name text position
    nameCX:      { type: Number, default: 0.528 },
    nameCY:      { type: Number, default: 0.598 },
    nameFontPct: { type: Number, default: 0.025 },

    // Max combined characters (firstName + lastName)
    maxName:     { type: Number, default: 18 },
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
