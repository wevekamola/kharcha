import mongoose from 'mongoose';

const parsedNarrationSchema = new mongoose.Schema({
  paymentType:  String,
  merchantName: String,
  upiId:        String,
  bankCode:     String,
  refNo:        String,
  userNote:     String,
}, { _id: false });

const transactionSchema = new mongoose.Schema({
  accountId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  date:             { type: Date, required: true },
  rawNarration:     { type: String, required: true },
  parsedNarration:  { type: parsedNarrationSchema, default: {} },
  debit:            { type: Number, default: 0 },
  credit:           { type: Number, default: 0 },
  closingBalance:   { type: Number, default: null },
  chqRefNo:         { type: String, default: null },
  category:         { type: String, default: 'other' },
  categorySource:   { type: String, enum: ['auto', 'manual'], default: 'auto' },
  uploadBatchId:    { type: mongoose.Schema.Types.ObjectId, ref: 'UploadBatch' },
  dedupHash:        { type: String, required: true, unique: true },
}, { timestamps: true });

transactionSchema.index({ accountId: 1, date: -1 });
transactionSchema.index({ date: -1 });
transactionSchema.index({ category: 1 });

export default mongoose.model('Transaction', transactionSchema);
