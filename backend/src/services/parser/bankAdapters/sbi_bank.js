import { parseSBI } from '../narrationParser.js';

/**
 * SBI Bank adapter.
 * Expected columns: Date, Details, Debit, Credit, Balance, Ref No/Cheque No
 */
export function normalize(row) {
  const rawNarration = (row['Details'] || '').replace(/\s+/g, ' ').trim();
  return {
    date:           parseDate(row['Date']),
    rawNarration,
    debit:          parseAmount(row['Debit']),
    credit:         parseAmount(row['Credit']),
    closingBalance: parseAmount(row['Balance']),
    chqRefNo:       (row['Ref No/Cheque No'] || '').trim() || null,
  };
}

function parseDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  const d = new Date(s);
  if (!isNaN(d)) return d;
  return null;
}

function parseAmount(val) {
  if (val == null || val === '') return 0;
  const n = parseFloat(String(val).replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}
