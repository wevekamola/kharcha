import { useState, useEffect, useRef } from 'react';
import { catById, CATEGORIES } from '../config/categories.js';
import { useStore } from '../store/useStore.js';
import { fmtR, fmtDate } from '../utils/format.js';
import api from '../lib/api.js';

function CategoryPill({ tx, onUpdate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cat = catById[tx.category] || { name: tx.category, color: '#C7BDAA' };

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div style={{position:'relative',display:'inline-block'}} ref={ref}>
      <span className="cat-pill-tx"
        style={{ background: cat.color + '22', color: cat.color }}
        onClick={() => setOpen(o => !o)}>
        {cat.name}{tx.categorySource === 'manual' ? ' ✎' : ''}
      </span>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,background:'var(--card)',border:'1px solid var(--line)',borderRadius:12,padding:6,zIndex:60,boxShadow:'0 12px 30px -10px rgba(33,30,24,.18)',minWidth:160,maxHeight:260,overflowY:'auto'}}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => { onUpdate(tx._id, c.id); setOpen(false); }}
              style={{display:'flex',alignItems:'center',gap:8,width:'100%',background:tx.category===c.id?cat.color+'22':'none',border:'none',color:'var(--ink)',fontSize:13,padding:'8px 10px',borderRadius:8,cursor:'pointer',textAlign:'left'}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:c.color,flex:'none'}}/>
              {c.name}
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
  const acctById = Object.fromEntries(accounts.map(a => [String(a._id), a]));

  const [summary, setSummary] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

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

  const sort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const ar = key => sortKey === key ? (sortDir === 'desc' ? '▼' : '▲') : '';

  const sortedTxns = [...txns].sort((a,b) => {
    let av, bv;
    if (sortKey==='date') { av=new Date(a.date); bv=new Date(b.date); }
    else if (sortKey==='sent') { av=a.debit||0; bv=b.debit||0; }
    else if (sortKey==='recv') { av=a.credit||0; bv=b.credit||0; }
    else return 0;
    return sortDir==='desc' ? (bv>av?1:-1) : (av>bv?1:-1);
  });

  const net = (summary?.totalCredit||0) - (summary?.totalDebit||0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{fontSize:22,marginBottom:4}}>{bucket.label}</h2>
        <div style={{fontSize:13,color:'var(--muted)'}}>All transactions in this month</div>
      </div>

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : (
        <>
          <div className="cards" style={{marginBottom:24}}>
            {[
              {lbl:'Received', val:fmtR(summary?.totalCredit||0), cls:'up'},
              {lbl:'Sent',     val:fmtR(summary?.totalDebit||0),  cls:'down'},
              {lbl:'Net', val:(net>=0?'+':'')+fmtR(net), cls:net>=0?'up':'down'},
              {lbl:'Transactions', val:txns.length.toLocaleString('en-IN'), cls:''},
            ].map((c,i) => (
              <div key={i} className="card">
                <div className="lbl">{c.lbl}</div>
                <div className={`val num ${c.cls}`} style={{fontSize:26}}>{c.val}</div>
              </div>
            ))}
          </div>

          <p className="count"><b>{sortedTxns.length.toLocaleString('en-IN')}</b> transactions</p>
          <div className="tablewrap">
            <table>
              <thead><tr>
                <th onClick={()=>sort('date')}>Date <span className="ar">{ar('date')}</span></th>
                <th>Bank</th>
                <th>Description</th>
                <th>Category</th>
                <th onClick={()=>sort('sent')} style={{textAlign:'right'}}>Sent <span className="ar">{ar('sent')}</span></th>
                <th onClick={()=>sort('recv')} style={{textAlign:'right'}}>Received <span className="ar">{ar('recv')}</span></th>
                <th style={{textAlign:'right'}}>Balance</th>
              </tr></thead>
              <tbody>
                {sortedTxns.map(t => {
                  const acct = acctById[String(t.accountId)];
                  const bankId = acct?.bankId || '';
                  const merch = t.parsedNarration?.merchantName || t.rawNarration;
                  const note  = t.parsedNarration?.userNote;
                  return (
                    <tr key={t._id}>
                      <td className="num" style={{whiteSpace:'nowrap',fontSize:12}}>{fmtDate(t.date)}</td>
                      <td><span className={`bank-pill bank-${bankId} ${!bankId?'bank-default':''}`}>{bankId.replace('_BANK','').replace('_CC',' CC')}</span></td>
                      <td><div className="desc" title={merch}>{merch}{note&&<span style={{color:'var(--muted)',marginLeft:6,fontSize:11}}>· {note}</span>}</div></td>
                      <td><CategoryPill tx={t} onUpdate={updateCategory}/></td>
                      <td className="num" style={{textAlign:'right',color:t.debit>0?'var(--sent)':'#C7BDAA'}}>
                        {t.debit>0 ? fmtR(t.debit) : <span className="zero">—</span>}
                      </td>
                      <td className="num" style={{textAlign:'right',color:t.credit>0?'var(--recv)':'#C7BDAA'}}>
                        {t.credit>0 ? fmtR(t.credit) : <span className="zero">—</span>}
                      </td>
                      <td className="num" style={{textAlign:'right',color:'var(--muted)',fontSize:12}}>
                        {t.closingBalance ? fmtR(t.closingBalance) : <span className="zero">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {txns.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">No transactions in this month</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
