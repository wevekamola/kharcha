import mongoose from 'mongoose';

const uploadBatchSchema = new mongoose.Schema({
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  bankId:    { type: String, required: true },
  format:    { type: String, required: true, enum: ['delimited', 'csv', 'excel'] },
  fileName:  { type: String, required: true },
  statementPeriod: {
    from: { type: Date, default: null },
    to:   { type: Date, default: null },
  },
  counts: {
    total:    { type: Number, default: 0 },
    inserted: { type: Number, default: 0 },
    skipped:  { type: Number, default: 0 },
  },
  status:    { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
  error:     { type: String, default: null },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model('UploadBatch', uploadBatchSchema);
