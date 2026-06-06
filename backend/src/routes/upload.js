import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import Transaction from '../models/Transaction.js';
import UploadBatch from '../models/UploadBatch.js';
import Account from '../models/Account.js';
import { readFile } from '../services/parser/fileReader.js';
import * as autoAdapter from '../services/parser/bankAdapters/auto.js';
import { parseNarration } from '../services/parser/narrationParser.js';
import { assignCategory } from '../services/categorizer/mapper.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/upload/inspect — returns column names + first 3 rows, never saves anything
router.post('/inspect', upload.single('file'), async (req, res) => {
  const { format = 'excel' } = req.body;
  if (!req.file) return res.status(400).json({ message: 'No file' });
  const rows = readFile(req.file.buffer, format);
  res.json({
    columns:   Object.keys(rows[0] || {}),
    rowCount:  rows.length,
    sample:    rows.slice(0, 3),
  });
});

/**
 * Auto-detect narration format from content:
 * HDFC uses hyphens: "UPI-MERCHANT-UPIID-BANKCODE..."
 * SBI uses slashes: "TYPE/DR_CR/REFNO/MERCHANT/BANKCODE..."
 * Check a sample of narrations to decide.
 */
function detectNarrationBank(rows) {
  let hdfc_hyphens = 0, sbi_slashes = 0;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const narr = (rows[i].Narration || rows[i].Details || '').toUpperCase();
    if (!narr) continue;
    // HDFC: UPI-something, IMPS-something, or contains many hyphens
    if (/^(UPI|IMPS|NEFT|RTGS|ACH|POS|ATM|EMI|NWD)-/.test(narr)) hdfc_hyphens++;
    // SBI: contains slashes and common SBI patterns
    if (narr.includes('/') && /^[A-Z]+\//.test(narr)) sbi_slashes++;
  }
  return sbi_slashes > hdfc_hyphens ? 'SBI' : 'HDFC';
}

function detectFormat(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  return ['xls', 'xlsx'].includes(ext) ? 'excel' : 'csv';
}

router.post('/', upload.single('file'), async (req, res) => {
  const { accountId } = req.body;
  // format is auto-detected from filename if not explicitly provided
  const format = req.body.format || detectFormat(req.file?.originalname || '');

  if (!req.file)    return res.status(400).json({ message: 'No file uploaded' });
  if (!accountId)   return res.status(400).json({ message: 'accountId is required' });

  // Fetch the account
  const account = await Account.findById(accountId);
  if (!account) return res.status(400).json({ message: `Account not found: ${accountId}` });

  const batch = await UploadBatch.create({
    accountId: account._id,
    format,
    fileName:  req.file.originalname,
    status:    'processing',
  });

  try {
    const rawRows = readFile(req.file.buffer, format);
    if (rawRows.length === 0) {
      await UploadBatch.findByIdAndUpdate(batch._id, {
        status: 'completed',
        counts: { total: 0, inserted: 0, skipped: 0 },
        statementPeriod: { from: null, to: null },
      });
      return res.json({ batchId: batch._id, total: 0, inserted: 0, skipped: 0, account });
    }

    // Validate columns match the Kharcha format
    if (rawRows.length > 0) {
      try {
        autoAdapter.validateColumns(rawRows[0]);
      } catch (e) {
        await UploadBatch.findByIdAndUpdate(batch._id, { status: 'failed', error: e.message });
        return res.status(400).json({ message: e.message });
      }
    }

    // Auto-detect narration format from content (HDFC hyphens vs SBI slashes)
    const narrationBank = detectNarrationBank(rawRows);

    // Normalize using the unified adapter
    const normalized = rawRows.map(r => autoAdapter.normalize(r)).filter(r => r.date);

    let inserted = 0, skipped = 0;
    const dates = [];

    for (const row of normalized) {
      const dedupHash = sha256(`${row.date?.toISOString()}${row.rawNarration}${row.debit}${row.credit}`);
      if (await Transaction.exists({ dedupHash })) { skipped++; continue; }

      const parsed   = parseNarration(row.rawNarration, narrationBank);
      const category = await assignCategory({ ...parsed, rawNarration: row.rawNarration });

      await Transaction.create({
        accountId:       account._id,
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

    res.json({ batchId: batch._id, total: normalized.length, inserted, skipped, account });
  } catch (err) {
    await UploadBatch.findByIdAndUpdate(batch._id, { status: 'failed', error: err.message });
    throw err;
  }
});

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

export default router;
