/**
 * YES Bank Credit Card adapter — best-guess column names, confirm from actual file.
 * Expected: Transaction Date, Transaction Description, Debit, Credit
 */
export function normalize(row) {
  return {
    date:           parseDate(row['Transaction Date']),
    rawNarration:   (row['Transaction Description'] || '').trim(),
    debit:          parseAmount(row['Debit']),
    credit:         parseAmount(row['Credit']),
    closingBalance: null,
    chqRefNo:       (row['Reference No.'] || '').trim() || null,
  };
}

function parseDate(val) {
  if (!val) return null;
  const d = new Date(String(val).trim());
  return isNaN(d) ? null : d;
}

function parseAmount(val) {
  if (val == null || val === '') return 0;
  const n = parseFloat(String(val).replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}
