/**
 * HDFC Bank adapter.
 * Confirmed column names from real delimited file.
 * Columns: Date, Narration, Value Dat, Debit Amount, Credit Amount, Chq/Ref Number, Closing Balance
 */
export function normalize(row) {
  return {
    date:           parseDate(row['Date']),
    rawNarration:   (row['Narration'] || '').trim(),
    debit:          parseAmount(row['Debit Amount']),
    credit:         parseAmount(row['Credit Amount']),
    closingBalance: parseAmount(row['Closing Balance']),
    chqRefNo:       (row['Chq/Ref Number'] || '').trim() || null,
  };
}

function parseDate(val) {
  if (!val) return null;
  const s = val.trim();
  // DD/MM/YY
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (m) return new Date(`20${m[3]}-${m[2]}-${m[1]}T00:00:00.000Z`);
  // DD/MM/YYYY fallback
  const m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m2) return new Date(`${m2[3]}-${m2[2]}-${m2[1]}T00:00:00.000Z`);
  return new Date(s);
}

function parseAmount(val) {
  if (val == null || val === '') return 0;
  const n = parseFloat(String(val).replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}
