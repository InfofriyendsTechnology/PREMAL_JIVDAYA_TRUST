import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  phone:     { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Submission', submissionSchema);
