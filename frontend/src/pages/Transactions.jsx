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

export default function Transactions({ apiParams }) {
  const accounts = useStore(s => s.accounts);
  const acctById = Object.fromEntries(accounts.map(a => [a._id, a]));

  const [txns,    setTxns]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [q,       setQ]       = useState('');
  const [loading, setLoading] = useState(true);
  const LIMIT = 50;

  useEffect(() => {
    setPage(1);
  }, [JSON.stringify(apiParams)]);

  useEffect(() => {
    setLoading(true);
    api.get('/transactions', { params: { ...apiParams, page, limit: LIMIT } })
      .then(r => {
        setTxns(r.data.transactions);
        setTotal(r.data.total);
      })
      .finally(() => setLoading(false));
  }, [JSON.stringify(apiParams), page]);

  const updateCategory = async (id, category) => {
    await api.patch(`/transactions/${id}`, { category });
    setTxns(prev => prev.map(t => t._id === id ? { ...t, category, categorySource: 'manual' } : t));
  };

  const filtered = q.trim()
    ? txns.filter(t => {
        const ql = q.toLowerCase();
        const merch = (t.parsedNarration?.merchantName || t.rawNarration || '').toLowerCase();
        const cat   = (catById[t.category]?.name || t.category).toLowerCase();
        return merch.includes(ql) || cat.includes(ql);
      })
    : txns;

  return (
    <div className="txn-page">
      <div className="panel glass">
        <div className="panel-head">
          <div>
            <h3>Transactions</h3>
            <p className="panel-sub">{total.toLocaleString('en-IN')} in current filter</p>
          </div>
          <div className="search">
            <svg width="15" height="15" viewBox="0 0 16 16">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input placeholder="Search merchant or category…" value={q} onChange={e => setQ(e.target.value)} />
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

          {loading && <div className="empty">Loading…</div>}

          {!loading && filtered.map(t => {
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

          {!loading && filtered.length === 0 && <div className="empty pad">No transactions match</div>}
        </div>

        {/* Pagination */}
        {!loading && total > LIMIT && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'center', alignItems: 'center' }}>
            <button className="load-more" style={{ width: 'auto', padding: '11px 24px' }}
              disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>
              Page {page} of {Math.ceil(total / LIMIT)}
            </span>
            <button className="load-more" style={{ width: 'auto', padding: '11px 24px' }}
              disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
