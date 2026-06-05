/**
 * Parses Indian bank narration strings into structured fields.
 * Supports HDFC (hyphen-delimited) and SBI (slash-delimited) formats.
 */

const IFSC   = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const REFNUM = /^\d{9,}$/;
const clean  = s => String(s ?? '').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------
// HDFC narration parser (hyphen-delimited)
// ---------------------------------------------------------------------------
export function parseHDFC(narr) {
  if (!narr) return { paymentType: 'OTHER' };

  const raw   = clean(narr);
  const parts = raw.split('-').map(p => clean(p));

  const first = parts[0].toUpperCase();

  // Determine paymentType from first token
  let paymentType;
  if (first === 'UPI')                              paymentType = 'UPI';
  else if (first === 'IMPS')                        paymentType = 'IMPS';
  else if (first === 'NEFT')                        paymentType = 'NEFT';
  else if (first === 'RTGS')                        paymentType = 'RTGS';
  else if (first === 'ACH')                         paymentType = 'ACH';
  else if (first === 'POS')                         paymentType = 'POS';
  else if (first === 'ATM' || first === 'NWD' || first === 'ATW') paymentType = 'ATM';
  else if (first === 'EMI')                         paymentType = 'EMI';
  else if (first.includes('INTEREST'))              paymentType = 'INTEREST';
  else                                               paymentType = first;

  // Generic extraction across remaining tokens
  let upiId      = null;
  let bankCode   = null;
  let refNo      = null;

  const remaining = parts.slice(1);

  for (const p of remaining) {
    const u = p.toUpperCase();
    if (!upiId    && p.includes('@'))  upiId    = p;
    if (!bankCode && IFSC.test(u))     bankCode = u;
    if (!refNo    && REFNUM.test(p))   refNo    = p;
  }

  // merchantName by type
  let merchantName = null;

  if (paymentType === 'UPI' || paymentType === 'ACH') {
    merchantName = parts[1] ? parts[1].toUpperCase() : null;
  } else if (paymentType === 'IMPS' || paymentType === 'NEFT' || paymentType === 'RTGS') {
    if (parts[1] && REFNUM.test(parts[1])) {
      refNo        = parts[1];
      merchantName = parts[2] ? parts[2].toUpperCase() : null;
    } else {
      merchantName = parts[1] ? parts[1].toUpperCase() : null;
    }
    // Also accept bare 4-letter code as bankCode for IMPS family
    for (const p of remaining) {
      if (!bankCode && /^[A-Z]{4}$/.test(p.toUpperCase())) bankCode = p.toUpperCase();
    }
  }

  // userNote = last token IF it contains letters AND isn't already used
  const lastToken = parts[parts.length - 1];
  let userNote = null;
  if (
    lastToken &&
    /[A-Za-z]/.test(lastToken) &&
    lastToken !== refNo &&
    lastToken.toUpperCase() !== bankCode &&
    lastToken !== upiId &&
    lastToken.toUpperCase() !== merchantName
  ) {
    userNote = lastToken.toUpperCase();
  }

  return {
    paymentType,
    merchantName: merchantName || null,
    upiId:        upiId        || null,
    bankCode:     bankCode     || null,
    refNo:        refNo        || null,
    userNote:     userNote     || null,
  };
}

// ---------------------------------------------------------------------------
// SBI narration parser (slash-delimited)
// ---------------------------------------------------------------------------
export function parseSBI(narr) {
  if (!narr) return { paymentType: 'OTHER' };

  const raw = clean(narr);
  const u   = raw.toUpperCase();

  if (u.includes('INTEREST')) return { paymentType: 'INTEREST' };

  const parts = raw.split('/').map(p => clean(p));
  const p0    = (parts[0] || '').toUpperCase();

  // Determine paymentType
  let paymentType;
  if (u.includes('UPI'))                                           paymentType = 'UPI';
  else if (u.includes('ATM') || u.includes('NWD'))                paymentType = 'ATM';
  else if (p0.startsWith('BY TRANSFER') || u.includes('NEFT'))   paymentType = 'TRANSFER';
  else if (u.includes('CHEQUE') || u.includes('CHQ'))            paymentType = 'CHEQUE';
  else                                                             paymentType = p0 || 'OTHER';

  // parts[1] is DR/CR direction flag — ignore
  // parts[2] = refNo if REFNUM
  const refNo      = (parts[2] && REFNUM.test(parts[2])) ? parts[2] : null;
  const merchantName = parts[3] ? clean(parts[3]).toUpperCase() : null;
  const bankCode   = (parts[4] && /^[A-Z]{4}$/.test(parts[4].toUpperCase())) ? parts[4].toUpperCase() : null;
  const upiId      = parts.find(p => p.includes('@')) || null;

  return {
    paymentType,
    merchantName: merchantName || null,
    upiId:        upiId        || null,
    bankCode:     bankCode     || null,
    refNo:        refNo        || null,
    userNote:     null,
  };
}

// ---------------------------------------------------------------------------
// Unified entry point
// ---------------------------------------------------------------------------
export function parseNarration(rawNarration, bank = 'HDFC') {
  if (bank === 'SBI') return parseSBI(rawNarration);
  return parseHDFC(rawNarration);
}
