import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  statementType:  { type: String, required: true, enum: ['bank', 'credit_card'] },
  account_number: { type: String, default: null },
  last4:          { type: String, default: null },
  currency:       { type: String, default: 'INR' },
  color:          { type: String, default: '#6366f1' },
}, { timestamps: true });

export default mongoose.model('Account', accountSchema);
