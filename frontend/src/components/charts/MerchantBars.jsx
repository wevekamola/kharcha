import { useState } from 'react';
import { formatINR } from '../../utils/format.js';

export default function MerchantBars({ data, accent }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map(d => d.total));

  return (
    <div className="hbars">
      {data.map((d, i) => (
        <div className="hbar-row" key={d._id || d.name}
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <div className="hbar-name" title={d._id || d.name}>{d._id || d.name}</div>
          <div className="hbar-track">
            <div className="hbar-fill" style={{
              width: `${(d.total / max) * 100}%`,
              background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
              opacity: hover == null || hover === i ? 1 : 0.5,
            }} />
          </div>
          <div className="hbar-val">{formatINR(d.total)}</div>
        </div>
      ))}
    </div>
  );
}
