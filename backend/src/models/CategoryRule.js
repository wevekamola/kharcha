import mongoose from 'mongoose';

const categoryRuleSchema = new mongoose.Schema({
  keyword:   { type: String, required: true },
  category:  { type: String, required: true },
  matchType: { type: String, enum: ['contains', 'exact', 'regex'], default: 'contains' },
  appliesTo: { type: String, enum: ['merchantName', 'userNote', 'rawNarration', 'any'], default: 'any' },
  priority:  { type: Number, default: 10 },
}, { timestamps: true });

export default mongoose.model('CategoryRule', categoryRuleSchema);
