// Short compact: ₹0.72 L, ₹74.33 L, ₹1.21 Cr
export function fmtL(v) {
  const a = Math.abs(v);
  return (v < 0 ? '-' : '') + (a >= 1e7 ? '₹' + (a/1e7).toFixed(2) + ' Cr' : '₹' + (a/1e5).toFixed(2) + ' L');
}

// Full Indian grouping: ₹12,34,567
export function fmtR(v) {
  const n = Math.round(Math.abs(v));
  let x = n.toString(), l3 = x.slice(-3), rest = x.slice(0,-3);
  if (rest) l3 = ',' + l3;
  rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (v < 0 ? '-' : '') + '₹' + rest + l3;
}

// Keep these too:
export function formatINR(v) { return fmtR(v); }  // backwards compat alias
export function formatCompact(v) { return fmtL(v); }

export function isoDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

export function fmtDate(dateStr) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date(dateStr);
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}

export function groupIndian(num) {
  const n = Math.round(Math.abs(num)).toString();
  if (n.length <= 3) return n;
  const last3 = n.slice(-3), rest = n.slice(0,-3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}
