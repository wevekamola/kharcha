import { useState, useEffect, useRef } from 'react';
import { catById, CATEGORIES } from '../config/categories.js';
import { useStore } from '../store/useStore.js';
import { formatINR, fmtDate } from '../utils/format.js';
import api from '../lib/api.js';

function CategoryPill({ tx, onUpdate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cat = catById[tx.category] || { name: tx.category, color: '#6b7280' };

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="cat-edit-wrap" ref={ref}>
      <span className="cat-pill"
        style={{ background: cat.color + '22', color: cat.color }}
        onClick={() => setOpen(o => !o)}
        title="Click to change category">
        {cat.name}{tx.categorySource === 'manual' ? ' ✎' : ''}
      </span>
      {open && (
        <div className="dd-menu cat-dd">
          {CATEGORIES.map(c => (
            <button key={c.id} className={'dd-item' + (tx.category === c.id ? ' sel' : '')}
              onClick={() => { onUpdate(tx._id, c.id); setOpen(false); }}>
              <span className="dot" style={{ background: c.color }} />{c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function monthDateRange(key) {
  // key is "YYYY-MM" where MM is 0-indexed month
  const [yr, mo] = key.split('-').map(Number);
  const from = new Date(yr, mo, 1);
  const to = new Date(yr, mo + 1, 0); // last day of month
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { from: fmt(from), to: fmt(to) };
}

export default function MonthDetail({ bucket, apiParams, onBack }) {
  const accounts = useStore(s => s.accounts);
  const acctById = Object.fromEntries(accounts.map(a => [a._id, a]));

  const [summary, setSummary] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  const { from, to } = monthDateRange(bucket.key);
  const monthParams = { ...apiParams, startDate: from, endDate: to };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/transactions/summary', { params: monthParams }),
      api.get('/transactions', { params: { ...monthParams, limit: 5000, page: 1 } }),
    ]).then(([s, t]) => {
      setSummary(s.data);
      setTxns(t.data.transactions);
    }).finally(() => setLoading(false));
  }, [bucket.key, JSON.stringify(apiParams)]);

  const updateCategory = async (id, category) => {
    await api.patch(`/transactions/${id}`, { category });
    setTxns(prev => prev.map(t => t._id === id ? { ...t, category, categorySource: 'manual' } : t));
  };

  return (
    <div className="txn-page">
      <div style={{ marginBottom: 16 }}>
        <button className="nav-link" onClick={onBack}>← Back</button>
        <span style={{ marginLeft: 12, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
          {bucket.label} — All transactions
        </span>
      </div>

      {loading ? (
        <div className="empty pad">Loading…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div className="stat-card glass">
              <div className="stat-label">Total Spent</div>
              <div className="stat-value debit">{formatINR(summary?.totalDebit || 0)}</div>
            </div>
            <div className="stat-card glass">
              <div className="stat-label">Total Received</div>
              <div className="stat-value credit">{formatINR(summary?.totalCredit || 0)}</div>
            </div>
          </div>

          <div className="panel glass">
            <div className="panel-head">
              <div>
                <h3>Transactions</h3>
                <p className="panel-sub">{txns.length.toLocaleString('en-IN')} transactions</p>
              </div>
            </div>

            <div className="txn-table">
              <div className="txn-head">
                <span>Date</span>
                <span>Merchant</span>
                <span>Category</span>
                <span>Account</span>
                <span>Mode</span>
                <span className="ta-r">Amount</span>
              </div>

              {txns.map(t => {
                const acct  = acctById[t.accountId];
                const merch = t.parsedNarration?.merchantName || t.rawNarration;
                const note  = t.parsedNarration?.userNote;
                const mode  = t.parsedNarration?.paymentType || '—';
                const isDebit = t.debit > 0;

                return (
                  <div className="txn-row" key={t._id}>
                    <span className="txn-date">{fmtDate(t.date)}</span>
                    <span className="txn-merch">
                      {merch}
                      {note && <em>{note}</em>}
                    </span>
                    <span>
                      <CategoryPill tx={t} onUpdate={updateCategory} />
                    </span>
                    <span className="txn-acct">
                      {acct && <span className="dot" style={{ background: acct.color }} />}
                      {acct?.name?.split(' ')[0] || '—'}
                    </span>
                    <span className="txn-mode">{mode}</span>
                    <span className={'txn-amt ta-r ' + (isDebit ? 'debit' : 'credit')}>
                      {isDebit ? '−' : '+'}{formatINR(isDebit ? t.debit : t.credit)}
                    </span>
                  </div>
                );
              })}

              {txns.length === 0 && <div className="empty pad">No transactions in this month</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
