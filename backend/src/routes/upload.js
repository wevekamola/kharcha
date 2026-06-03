import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import Transaction from '../models/Transaction.js';
import UploadBatch from '../models/UploadBatch.js';
import { readFile } from '../services/parser/fileReader.js';
import { getAdapter } from '../services/parser/bankAdapters/index.js';
import { parseNarration } from '../services/parser/narrationParser.js';
import { assignCategory } from '../services/categorizer/mapper.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', upload.single('file'), async (req, res) => {
  const { accountId, bankId, format } = req.body;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  if (!accountId || !bankId || !format) {
    return res.status(400).json({ message: 'accountId, bankId, and format are required' });
  }

  const batch = await UploadBatch.create({
    accountId,
    bankId,
    format,
    fileName: req.file.originalname,
    status: 'processing',
  });

  try {
    const rawRows  = readFile(req.file.buffer, format);
    const adapter  = getAdapter(bankId);
    const normalized = rawRows.map(r => adapter.normalize(r)).filter(r => r.date);

    let inserted = 0;
    let skipped  = 0;
    const dates  = [];

    for (const row of normalized) {
      const dedupHash = sha256(`${row.date?.toISOString()}${row.rawNarration}${row.debit}${row.credit}`);
      const exists = await Transaction.exists({ dedupHash });
      if (exists) { skipped++; continue; }

      const parsed   = parseNarration(row.rawNarration);
      const category = await assignCategory({ ...parsed, rawNarration: row.rawNarration });

      await Transaction.create({
        accountId,
        date:            row.date,
        rawNarration:    row.rawNarration,
        parsedNarration: parsed,
        debit:           row.debit,
        credit:          row.credit,
        closingBalance:  row.closingBalance,
        chqRefNo:        row.chqRefNo,
        category,
        categorySource:  'auto',
        uploadBatchId:   batch._id,
        dedupHash,
      });

      inserted++;
      dates.push(row.date);
    }

    const statementPeriod = dates.length
      ? { from: new Date(Math.min(...dates)), to: new Date(Math.max(...dates)) }
      : { from: null, to: null };

    await UploadBatch.findByIdAndUpdate(batch._id, {
      status: 'completed',
      counts: { total: normalized.length, inserted, skipped },
      statementPeriod,
    });

    res.json({ batchId: batch._id, total: normalized.length, inserted, skipped });
  } catch (err) {
    await UploadBatch.findByIdAndUpdate(batch._id, { status: 'failed', error: err.message });
    throw err;
  }
});

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

export default router;
