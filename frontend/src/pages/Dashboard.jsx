import { useState, useEffect, useMemo } from 'react';
import StatCards from '../components/StatCards.jsx';
import CashFlowChart from '../components/charts/CashFlowChart.jsx';
import CategoryDonut from '../components/charts/CategoryDonut.jsx';
import MerchantBars from '../components/charts/MerchantBars.jsx';
import { catById } from '../config/categories.js';
import { formatINR } from '../utils/format.js';
import api from '../lib/api.js';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ACCENT = 'var(--accent)';

function monthBuckets(from, to) {
  const out = [];
  let d = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (d <= end) {
    out.push({ key: d.getFullYear() + '-' + String(d.getMonth()).padStart(2,'0'), label: MONTHS[d.getMonth()] + " '" + String(d.getFullYear()).slice(2), spent: 0, received: 0 });
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return out;
}

export default function Dashboard({ apiParams, range, setFilters }) {
  const [summary,   setSummary]   = useState(null);
  const [timeline,  setTimeline]  = useState([]);
  const [byCat,     setByCat]     = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeCat, setActiveCat] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/transactions/summary',     { params: apiParams }),
      api.get('/transactions/timeline',    { params: { ...apiParams, groupBy: 'month' } }),
      api.get('/transactions/by-category', { params: apiParams }),
      api.get('/transactions/top-merchants',{ params: { ...apiParams, limit: 10 } }),
    ]).then(([s, t, c, m]) => {
      setSummary(s.data);
      setTimeline(t.data);
      setByCat(c.data);
      setMerchants(m.data);
    }).finally(() => setLoading(false));
  }, [JSON.stringify(apiParams)]);

  // Build cashflow buckets from timeline data
  const cashflow = useMemo(() => {
    const buckets = monthBuckets(range[0], range[1]);
    const map = Object.fromEntries(buckets.map(b => [b.key, b]));
    timeline.forEach(row => {
      // row._id = "2026-01" from $dateToString format "%Y-%m" (1-indexed month)
      const [yr, mo] = row._id.split('-');
      const k = yr + '-' + String(Number(mo) - 1).padStart(2, '0'); // bucket uses 0-indexed month
      if (map[k]) {
        map[k].spent    = (map[k].spent    || 0) + (row.totalDebit  || 0);
        map[k].received = (map[k].received || 0) + (row.totalCredit || 0);
      }
    });
    return buckets.slice(-12);
  }, [timeline, range]);

  // Build category slices
  const catSlices = useMemo(() => byCat.map(row => {
    const meta = catById[row._id] || { name: row._id, color: '#888' };
    return { id: row._id, name: meta.name, color: meta.color, value: row.total };
  }), [byCat]);

  const catTotal = catSlices.reduce((s, c) => s + c.value, 0);

  if (loading) return <div className="empty pad">Loading…</div>;

  return (
    <div className="dash">
      <StatCards summary={summary} />

      <div className="panel glass chart-panel">
        <div className="panel-head">
          <div>
            <h3>Monthly Cash Flow</h3>
            <p className="panel-sub">Spent vs received per month</p>
          </div>
          <div className="legend">
            <span className="leg"><span className="leg-dot" style={{ background: ACCENT }} />Spent</span>
            <span className="leg"><span className="leg-dot" style={{ background: 'var(--credit)' }} />Received</span>
          </div>
        </div>
        <CashFlowChart data={cashflow} accent={ACCENT} />
      </div>

      <div className="dash-bottom">
        <div className="panel glass">
          <div className="panel-head">
            <div>
              <h3>Spend by Category</h3>
              <p className="panel-sub">{catSlices.length} categories</p>
            </div>
          </div>
          {catSlices.length ? (
            <div className="donut-layout">
              <CategoryDonut slices={catSlices} total={catTotal} active={activeCat} onSelect={setActiveCat} />
              <div className="cat-legend">
                {catSlices.map(c => (
                  <button key={c.id}
                    className={'cat-leg' + (activeCat === c.id ? ' on' : '')}
                    onMouseEnter={() => setActiveCat(c.id)}
                    onMouseLeave={() => setActiveCat(null)}
                    onClick={() => setFilters(f => ({ ...f, category: f.category === c.id ? 'all' : c.id }))}>
                    <span className="leg-dot" style={{ background: c.color }} />
                    <span className="cat-leg-name">{c.name}</span>
                    <span className="cat-leg-val">{formatINR(c.value)}</span>
                    <span className="cat-leg-pct">{catTotal ? Math.round(c.value / catTotal * 100) : 0}%</span>
                  </button>
                ))}
              </div>
            </div>
          ) : <div className="empty">No spend data in range</div>}
        </div>

        <div className="panel glass">
          <div className="panel-head">
            <div>
              <h3>Top Merchants</h3>
              <p className="panel-sub">Ranked by spend</p>
            </div>
          </div>
          {merchants.length
            ? <MerchantBars data={merchants} accent={ACCENT} />
            : <div className="empty">No UPI spend in range</div>}
        </div>
      </div>
    </div>
  );
}
