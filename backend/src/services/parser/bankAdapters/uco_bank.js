/**
 * UCO Bank adapter — best-guess column names, confirm from actual file.
 * Expected: Transaction Date, Particulars, Withdrawals, Deposits, Balance
 */
export function normalize(row) {
  return {
    date:           parseDate(row['Transaction Date']),
    rawNarration:   (row['Particulars'] || '').trim(),
    debit:          parseAmount(row['Withdrawals']),
    credit:         parseAmount(row['Deposits']),
    closingBalance: parseAmount(row['Balance']),
    chqRefNo:       (row['Chq No.'] || '').trim() || null,
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
