/**
 * ICICI Amazon Pay CC adapter — best-guess column names, confirm from actual file.
 * Expected: Transaction Date, Transaction Details, Amount (INR), CR/DR
 * CR/DR column: "CR" = credit, "DR" = debit
 */
export function normalize(row) {
  const amountRaw = parseAmount(row['Amount (INR)']);
  const crdr = (row['CR/DR'] || '').trim().toUpperCase();

  return {
    date:           parseDate(row['Transaction Date']),
    rawNarration:   (row['Transaction Details'] || '').trim(),
    debit:          crdr === 'DR' ? amountRaw : 0,
    credit:         crdr === 'CR' ? amountRaw : 0,
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
