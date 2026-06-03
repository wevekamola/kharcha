/**
 * Parses Indian bank narration strings into structured fields.
 * UPI format: UPI-{MERCHANT}-{VPA_LOCAL}@{BANK_HANDLE}-{BANK_IFSC}-{REF_NO}-{USER_NOTE}
 *
 * VPA detection: going backwards from '@', segments with no spaces are VPA local part.
 * First segment with spaces = merchant name boundary.
 */
export function parseNarration(raw) {
  if (!raw) return { paymentType: 'OTHER' };

  const s = raw.trim();

  if (s.startsWith('UPI-')) return parseUPI(s);
  if (s.startsWith('ACH D-')) return { paymentType: 'ACH_DEBIT', rawNarration: s };
  if (s.startsWith('ACH C-')) return { paymentType: 'ACH_CREDIT', rawNarration: s };
  if (s.startsWith('NEFT CR-')) return { paymentType: 'NEFT', rawNarration: s };
  if (s.startsWith('RTGS CR-')) return { paymentType: 'RTGS', rawNarration: s };
  if (s.startsWith('IMPS-')) return { paymentType: 'IMPS', rawNarration: s };
  if (s.startsWith('NWD-')) return { paymentType: 'ATM', rawNarration: s };
  if (s.startsWith('CBDT/')) return { paymentType: 'TAX', rawNarration: s };
  if (s.toUpperCase().includes('INTEREST PAID')) return { paymentType: 'INTEREST', rawNarration: s };

  return { paymentType: 'OTHER', rawNarration: s };
}

function parseUPI(s) {
  // Strip "UPI-" prefix then split on "-"
  const body = s.slice(4);
  const parts = body.split('-');

  // Find the segment containing "@" — that's the end of the VPA
  const atIdx = parts.findIndex(p => p.includes('@'));
  if (atIdx === -1) {
    return { paymentType: 'UPI', rawNarration: s };
  }

  // VPA local can span multiple segments when it contains hyphens (e.g. PAYTM-66116701@PAYTM).
  // Heuristic: scan backwards from the segment before atIdx.
  //   - Include segments that are PURELY numeric (digit-only, no spaces) as VPA local extensions.
  //   - Stop at the first segment that contains alphabetic characters — that's part of the merchant.
  //
  // This correctly handles:
  //   ZOMATO-PAYZOMATO@HDFCBANK         → merchant=ZOMATO,   vpa=PAYZOMATO@HDFCBANK
  //   PAYTM-PAYTM-66116701@PAYTM        → merchant=PAYTM-PAYTM, vpa=PAYTM-66116701@PAYTM (acceptable)
  //   AMAZON PAY-amazonpay@apl          → merchant=AMAZON PAY, vpa=amazonpay@apl
  let extraVpaLocal = [];
  let merchantEndIdx = atIdx;
  for (let i = atIdx - 1; i >= 0; i--) {
    if (/^\d+$/.test(parts[i].trim())) {
      extraVpaLocal.unshift(parts[i]);
      merchantEndIdx = i;
    } else {
      break;
    }
  }

  const merchantName = parts.slice(0, merchantEndIdx).join('-').trim() || null;
  const atPart       = parts[atIdx]; // e.g. "PAYZOMATO@HDFCBANK"
  const atLocal      = atPart.split('@')[0];
  const bankHandle   = atPart.split('@')[1] || null;
  const vpaLocal     = extraVpaLocal.length ? [...extraVpaLocal, atLocal].join('-') : atLocal;
  const upiId        = bankHandle ? `${vpaLocal}@${bankHandle}` : atPart;

  const bankCode = parts[atIdx + 1] || null;
  const refNo    = parts[atIdx + 2] || null;
  const userNote = parts.slice(atIdx + 3).join('-').trim() || null;

  return {
    paymentType:  'UPI',
    merchantName: merchantName ? merchantName.toUpperCase() : null,
    upiId:        upiId || null,
    bankCode:     bankCode || null,
    refNo:        refNo || null,
    userNote:     userNote ? userNote.toUpperCase() : null,
  };
}
