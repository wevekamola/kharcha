/**
 * HDFC Bank adapter.
 *
 * Handles two layouts:
 *   Delimited (.txt) — confirmed from real file
 *     Date | Narration | Value Dat | Debit Amount | Credit Amount | Chq/Ref Number | Closing Balance
 *
 *   Excel (.xls/.xlsx) — HDFC Net Banking export uses different headers:
 *     Date | Narration | Value Date | Withdrawal Amt. | Deposit Amt. | Closing Balance (Dr/Cr)
 *     OR:   Debit      | Credit     (older export style)
 *     OR:   Debit Amount | Credit Amount  (same as delimited but via Excel)
 */
export function normalize(row) {
  return {
    date:           parseDate(row['Date']),
    rawNarration:   str(row['Narration']),
    debit:          parseAmount(
                      row['Debit Amount']    ??
                      row['Withdrawal Amt.'] ??
                      row['Debit']           ??
                      row['Withdrawal Amount'] ??
                      null
                    ),
    credit:         parseAmount(
                      row['Credit Amount']   ??
                      row['Deposit Amt.']    ??
                      row['Credit']          ??
                      row['Deposit Amount']  ??
                      null
                    ),
    closingBalance: parseAmount(
                      row['Closing Balance'] ??
                      row['Balance']         ??
                      null
                    ),
    chqRefNo:       str(row['Chq/Ref Number'] ?? row['Chq./Ref.No.'] ?? row['Ref No'] ?? null),
  };
}

function str(val) {
  return val != null ? String(val).trim() : '';
}

function parseDate(val) {
  if (val == null || val === '') return null;

  // Already a JS Date (xlsx cellDates:true)
  if (val instanceof Date) return isNaN(val) ? null : val;

  const s = String(val).trim();

  // DD/MM/YY  e.g. 03/06/26
  const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (m1) return new Date(`20${m1[3]}-${m1[2]}-${m1[1]}T00:00:00.000Z`);

  // DD/MM/YYYY e.g. 03/06/2026
  const m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m2) return new Date(`${m2[3]}-${m2[2]}-${m2[1]}T00:00:00.000Z`);

  // DD-MM-YYYY
  const m3 = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m3) return new Date(`${m3[3]}-${m3[2]}-${m3[1]}T00:00:00.000Z`);

  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function parseAmount(val) {
  if (val == null || val === '') return 0;
  // Strip ₹, commas, spaces; handle Dr/Cr suffix
  const s = String(val).replace(/[₹,\s]/g, '').replace(/(Dr|CR|DR|Cr)$/i, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
