/**
 * SBI Bank adapter — best-guess column names, confirm from actual file.
 * Expected: Txn Date, Description, Debit, Credit, Balance
 */
export function normalize(row) {
  return {
    date:           parseDate(row['Txn Date']),
    rawNarration:   (row['Description'] || '').trim(),
    debit:          parseAmount(row['Debit']),
    credit:         parseAmount(row['Credit']),
    closingBalance: parseAmount(row['Balance']),
    chqRefNo:       (row['Ref No./Cheque No.'] || '').trim() || null,
  };
}

function parseDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  // DD MMM YYYY
  const d = new Date(s);
  if (!isNaN(d)) return d;
  return null;
}

function parseAmount(val) {
  if (val == null || val === '') return 0;
  const n = parseFloat(String(val).replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}
