import { formatCompact } from '../../utils/format.js';

function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arcPath(cx, cy, rOuter, rInner, a0, a1) {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = polar(cx, cy, rOuter, a1);
  const [x1, y1] = polar(cx, cy, rOuter, a0);
  const [x2, y2] = polar(cx, cy, rInner, a0);
  const [x3, y3] = polar(cx, cy, rInner, a1);
  return `M ${x0} ${y0} A ${rOuter} ${rOuter} 0 ${large} 0 ${x1} ${y1} L ${x2} ${y2} A ${rInner} ${rInner} 0 ${large} 1 ${x3} ${y3} Z`;
}

export default function CategoryDonut({ slices, total, active, onSelect }) {
  const size = 220, cx = size / 2, cy = size / 2;
  const rOuter = 100, rInner = 66;
  let a = 0;
  const arcs = slices.map(s => {
    const sweep = (s.value / Math.max(1, total)) * 360;
    const seg = { ...s, a0: a, a1: a + sweep };
    a += sweep;
    return seg;
  });
  const activeSlice = active ? slices.find(s => s.id === active) : null;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut">
      {arcs.map(s => {
        const isActive = active === s.id;
        const dim = active && !isActive;
        const gap = 1.2;
        return (
          <path
            key={s.id}
            d={arcPath(cx, cy, isActive ? rOuter + 5 : rOuter, rInner, s.a0 + gap, Math.max(s.a0 + gap, s.a1 - gap))}
            fill={s.color}
            opacity={dim ? 0.28 : 1}
            className="donut-seg"
            onMouseEnter={() => onSelect(s.id)}
            onMouseLeave={() => onSelect(null)}
            style={{ cursor: 'pointer' }}
          />
        );
      })}
      <text x={cx} y={cy - 8}  textAnchor="middle" className="donut-label">{activeSlice ? activeSlice.name : 'Total spend'}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" className="donut-total">{formatCompact(activeSlice ? activeSlice.value : total)}</text>
    </svg>
  );
}
