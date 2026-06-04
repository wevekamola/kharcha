export function groupIndian(num) {
  const n = Math.round(Math.abs(num)).toString();
  if (n.length <= 3) return n;
  const last3 = n.slice(-3);
  const rest = n.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

export function formatINR(num, { sign = false, decimals = false } = {}) {
  const neg = num < 0;
  const abs = Math.abs(num);
  let s = decimals
    ? '₹' + groupIndian(Math.trunc(abs)) + '.' + Math.round((abs - Math.trunc(abs)) * 100).toString().padStart(2, '0')
    : '₹' + groupIndian(abs);
  if (sign) return (neg ? '−' : '+') + s;
  return (neg ? '−' : '') + s;
}

export function formatCompact(num) {
  const a = Math.abs(num);
  if (a >= 10000000) return '₹' + (num / 10000000).toFixed(a % 10000000 === 0 ? 0 : 1) + 'Cr';
  if (a >= 100000)   return '₹' + (num / 100000).toFixed(a % 100000 === 0 ? 0 : 1) + 'L';
  if (a >= 1000)     return '₹' + Math.round(num / 1000) + 'k';
  return '₹' + Math.round(num);
}

export function isoDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function fmtDate(dateStr) {
  const d = new Date(dateStr);
  return d.getDate() + ' ' + MONTHS[d.getMonth()];
}
