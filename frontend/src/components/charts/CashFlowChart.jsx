import { useState, useRef, useLayoutEffect } from 'react';
import { formatINR, formatCompact } from '../../utils/format.js';

function useMeasure() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => setW(entries[0].contentRect.width));
    ro.observe(ref.current);
    setW(ref.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let step;
  if (norm <= 1) step = 1; else if (norm <= 2) step = 2; else if (norm <= 2.5) step = 2.5; else if (norm <= 5) step = 5; else step = 10;
  step *= mag;
  const ticks = [];
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v);
  return ticks;
}

export default function CashFlowChart({ data, accent }) {
  const [ref, w] = useMeasure();
  const [hover, setHover] = useState(null);
  const H = 300, padL = 56, padR = 12, padT = 16, padB = 34;
  const innerW = Math.max(10, w - padL - padR);
  const innerH = H - padT - padB;
  const max = Math.max(1, ...data.map(d => Math.max(d.spent || 0, d.received || 0)));
  const ticks = niceTicks(max, 4);
  const top = ticks[ticks.length - 1];
  const groups = data.length || 1;
  const groupW = innerW / groups;
  const barW = Math.min(26, groupW * 0.3);
  const gap = 6;
  const yOf = (v) => padT + innerH - (v / top) * innerH;
  const xOf = (i) => padL + groupW * i + groupW / 2;

  return (
    <div className="chart-wrap" ref={ref}>
      {w > 0 && (
        <svg width={w} height={H} role="img">
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={yOf(t)} y2={yOf(t)} className="grid-line" strokeDasharray={i === 0 ? '0' : '3 5'} />
              <text x={padL - 10} y={yOf(t) + 4} className="axis-label" textAnchor="end">{formatCompact(t)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = xOf(i);
            const x1 = cx - barW - gap / 2;
            const x2 = cx + gap / 2;
            const on = hover === i;
            const spentH = Math.max(0, padT + innerH - yOf(d.spent || 0));
            const recvH  = Math.max(0, padT + innerH - yOf(d.received || 0));
            return (
              <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={padL + groupW * i} y={padT} width={groupW} height={innerH} fill="transparent" />
                {spentH > 0 && <rect x={x1} y={yOf(d.spent || 0)} width={barW} height={spentH} rx={5} fill={accent} opacity={on ? 1 : 0.85} className="bar" />}
                {recvH  > 0 && <rect x={x2} y={yOf(d.received || 0)} width={barW} height={recvH}  rx={5} fill="var(--credit)" opacity={on ? 1 : 0.85} className="bar" />}
                <text x={cx} y={H - 12} className="axis-label" textAnchor="middle">{d.label}</text>
              </g>
            );
          })}
        </svg>
      )}
      {hover != null && data[hover] && (
        <div className="chart-tip" style={{ left: xOf(hover), top: 70, transform: xOf(hover) > w - 150 ? 'translate(-100%, -50%)' : 'translate(12px, -50%)' }}>
          <div className="tip-title">{data[hover].label}</div>
          <div className="tip-row"><span className="tip-dot" style={{ background: accent }} />Spent<b>{formatINR(data[hover].spent || 0)}</b></div>
          <div className="tip-row"><span className="tip-dot" style={{ background: 'var(--credit)' }} />Received<b>{formatINR(data[hover].received || 0)}</b></div>
        </div>
      )}
    </div>
  );
}
