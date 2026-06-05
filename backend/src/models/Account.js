import mongoose from 'mongoose';
import { BANK_IDS } from '../config/banks.js';

const accountSchema = new mongoose.Schema({
  name:           { type: String, required: true },
  bankId:         { type: String, required: true, enum: BANK_IDS },
  statementType:  { type: String, required: true, enum: ['bank', 'credit_card'] },
  account_number: { type: String, default: null },
  last4:          { type: String, default: null },
  currency:       { type: String, default: 'INR' },
  color:          { type: String, default: '#6366f1' },
}, { timestamps: true });

export default mongoose.model('Account', accountSchema);
