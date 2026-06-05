import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import Transaction from '../models/Transaction.js';
import UploadBatch from '../models/UploadBatch.js';
import Account from '../models/Account.js';
import { BANKS } from '../config/banks.js';
import { readFile } from '../services/parser/fileReader.js';
import { getAdapter } from '../services/parser/bankAdapters/index.js';
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

// One accent color per bank — used when auto-creating accounts
const BANK_COLORS = {
  HDFC_BANK:       '#6366f1',
  SBI_BANK:        '#3b82f6',
  UCO_BANK:        '#10b981',
  YES_CC:          '#f59e0b',
  ICICI_AMAZON_CC: '#ec4899',
};

/**
 * Derive the bank identifier string used for narration parsing from a bankId.
 * Returns 'HDFC', 'SBI', or 'HDFC' as default.
 */
function bankFromId(bankId = '') {
  if (bankId.startsWith('HDFC')) return 'HDFC';
  if (bankId.startsWith('SBI'))  return 'SBI';
  return 'HDFC';
}

router.post('/', upload.single('file'), async (req, res) => {
  const { accountId, bankId, statementType, format } = req.body;

  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  if (!format)   return res.status(400).json({ message: 'format is required' });

  let account;

  if (accountId) {
    // Use a pre-existing account directly
    account = await Account.findById(accountId);
    if (!account) return res.status(400).json({ message: `Account not found: ${accountId}` });
  } else {
    // Backwards-compat: auto-find-or-create from bankId + statementType
    if (!bankId)        return res.status(400).json({ message: 'bankId is required when accountId is not provided' });
    if (!statementType) return res.status(400).json({ message: 'statementType is required when accountId is not provided' });

    const bankConfig = BANKS.find(b => b.id === bankId);
    if (!bankConfig)    return res.status(400).json({ message: `Unknown bankId: ${bankId}` });

    account = await Account.findOne({ bankId, statementType });
    if (!account) {
      const typeName = statementType === 'bank' ? 'Current' : 'Credit';
      account = await Account.create({
        name:          `${bankConfig.name} ${typeName}`,
        bankId,
        statementType,
        color:         BANK_COLORS[bankId] || '#6366f1',
      });
    }
  }

  // Resolve the effective bankId for adapter + narration parsing
  const effectiveBankId = account.bankId;
  const bank            = bankFromId(effectiveBankId);

  const batch = await UploadBatch.create({
    accountId: account._id,
    bankId:    effectiveBankId,
    format,
    fileName:  req.file.originalname,
    status:    'processing',
  });

  try {
    const rawRows    = readFile(req.file.buffer, format);
    const adapter    = getAdapter(effectiveBankId);
    const normalized = rawRows.map(r => adapter.normalize(r)).filter(r => r.date);

    let inserted = 0, skipped = 0;
    const dates = [];

    for (const row of normalized) {
      const dedupHash = sha256(`${row.date?.toISOString()}${row.rawNarration}${row.debit}${row.credit}`);
      if (await Transaction.exists({ dedupHash })) { skipped++; continue; }

      const parsed   = parseNarration(row.rawNarration, bank);
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
