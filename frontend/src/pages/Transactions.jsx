import { useState, useEffect, useRef } from 'react';
import { catById, CATEGORIES } from '../config/categories.js';
import { useStore } from '../store/useStore.js';
import { fmtR, fmtDate } from '../utils/format.js';
import api from '../lib/api.js';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const YEARS = ['2024','2025','2026'];
const BANK_CHIPS = [{ id:'HDFC_BANK', label:'HDFC' }, { id:'SBI_BANK', label:'SBI' }];

function CategoryPill({ tx, onUpdate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cat = catById[tx.category] || { name: tx.category, color: '#C7BDAA' };
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div style={{position:'relative',display:'inline-block'}} ref={ref}>
      <span className="cat-pill-tx" style={{background:cat.color+'22',color:cat.color}} onClick={()=>setOpen(o=>!o)}>
        {cat.name}{tx.categorySource==='manual'?' ✎':''}
      </span>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,background:'var(--card)',border:'1px solid var(--line)',borderRadius:12,padding:6,zIndex:60,boxShadow:'0 12px 30px -10px rgba(33,30,24,.18)',minWidth:160,maxHeight:260,overflowY:'auto'}}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={()=>{onUpdate(tx._id,c.id);setOpen(false);}}
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

export default function Transactions({ initialParams }) {
  const accounts = useStore(s => s.accounts);
  const acctById = Object.fromEntries(accounts.map(a => [String(a._id), a]));

  const [selBanks,  setSelBanks]  = useState(new Set());
  const [selYears,  setSelYears]  = useState(new Set());
  const [selMonths, setSelMonths] = useState(new Set());
  const [query,     setQuery]     = useState('');
  const [queryLive, setQueryLive] = useState('');
  const [sortKey,   setSortKey]   = useState('date');
  const [sortDir,   setSortDir]   = useState('desc');
  const [txns,      setTxns]      = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [loading,   setLoading]   = useState(false);

  // Seed from initialParams (month drilldown)
  useEffect(() => {
    if (!initialParams) return;
    if (initialParams.year)  setSelYears(new Set([String(initialParams.year)]));
    if (initialParams.month) setSelMonths(new Set([String(initialParams.month - 1)])); // 0-indexed
    if (initialParams.bankId) setSelBanks(new Set([initialParams.bankId]));
  }, []);

  const isActive = selBanks.size > 0 || selYears.size > 0 || selMonths.size > 0 || query.trim();

  const toggle = (set, setter, val) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  };

  const reset = () => {
    setSelBanks(new Set()); setSelYears(new Set()); setSelMonths(new Set());
    setQuery(''); setQueryLive(''); setTxns([]); setSummary(null);
  };

  const runSearch = async () => {
    if (!isActive && !queryLive.trim()) return;
    setLoading(true);
    try {
      // Build date range from year+month chips
      let startDate, endDate;
      if (selYears.size > 0) {
        const yrList = [...selYears].sort();
        if (selMonths.size > 0) {
          const moList = [...selMonths].map(Number).sort();
          // Use first year+month to last year+month range
          startDate = `${yrList[0]}-${String(moList[0]+1).padStart(2,'0')}-01`;
          const lastYr = yrList[yrList.length-1], lastMo = moList[moList.length-1];
          const lastDay = new Date(Number(lastYr), lastMo+1, 0).getDate();
          endDate = `${lastYr}-${String(lastMo+1).padStart(2,'0')}-${lastDay}`;
        } else {
          startDate = `${yrList[0]}-01-01`;
          endDate   = `${yrList[yrList.length-1]}-12-31`;
        }
      }

      // Account IDs for selected banks
      const accountIds = selBanks.size > 0
        ? accounts.filter(a => selBanks.has(a.bankId)).map(a => a._id)
        : accounts.map(a => a._id);

      // Fetch per account (or single request if no bank filter)
      const params = { limit: 5000, page: 1 };
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;

      // If we have multiple accounts, fetch all and filter
      const allTxns = [];
      for (const acctId of accountIds) {
        const r = await api.get('/transactions', { params: { ...params, accountId: acctId } });
        allTxns.push(...r.data.transactions);
      }

      // Client-side search filter
      const q = queryLive.toLowerCase().trim();
      const filtered = q
        ? allTxns.filter(t => {
            const merch = (t.parsedNarration?.merchantName || t.rawNarration || '').toLowerCase();
            const cat   = (catById[t.category]?.name || t.category).toLowerCase();
            const amt   = String(t.debit || t.credit);
            return merch.includes(q) || cat.includes(q) || amt.includes(q);
          })
        : allTxns;

      // Also handle month filter client-side if multiple years
      const withMonthFilter = (selMonths.size > 0 && selYears.size > 1)
        ? filtered.filter(t => selMonths.has(String(new Date(t.date).getMonth())))
        : filtered;

      setTxns(withMonthFilter);

      // Compute summary
      let totalDebit=0, totalCredit=0;
      withMonthFilter.forEach(t => { totalDebit+=t.debit||0; totalCredit+=t.credit||0; });
      setSummary({ totalDebit, totalCredit, count: withMonthFilter.length });
    } finally {
      setLoading(false);
    }
  };

  // Run search when chips change (instant)
  useEffect(() => { if (isActive) runSearch(); }, [selBanks.size, selYears.size, selMonths.size]);

  const updateCategory = async (id, category) => {
    await api.patch(`/transactions/${id}`, { category });
    setTxns(prev => prev.map(t => t._id===id ? {...t, category, categorySource:'manual'} : t));
  };

  const sortedTxns = [...txns].sort((a,b) => {
    let av, bv;
    if (sortKey==='date')     { av=new Date(a.date); bv=new Date(b.date); }
    else if (sortKey==='sent')     { av=a.debit||0;  bv=b.debit||0; }
    else if (sortKey==='recv')     { av=a.credit||0; bv=b.credit||0; }
    else return 0;
    return sortDir==='desc' ? (bv>av?1:-1) : (av>bv?1:-1);
  });

  const sort = key => {
    if (sortKey===key) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const ar = key => sortKey===key ? (sortDir==='desc'?'▼':'▲') : '';
  const net = (summary?.totalCredit||0) - (summary?.totalDebit||0);

  return (
    <div className="wrap-txn">
      {/* Stat cards */}
      <div className="cards" style={{marginBottom:20}}>
        {[
          {lbl:'Received', val: fmtR(summary?.totalCredit||0), cls:'up'},
          {lbl:'Sent',     val: fmtR(summary?.totalDebit||0),  cls:'down'},
          {lbl:'Net', val:(net>=0?'+':'-')+''+fmtR(Math.abs(net)), cls:net>=0?'up':'down'},
          {lbl:'Showing', val:(summary?.count||0).toLocaleString('en-IN'), cls:'', dark:true},
        ].map((c,i) => (
          <div key={i} className={`card${c.dark?' feat':''}`}>
            <div className="lbl">{c.lbl}</div>
            <div className={`val num ${c.cls}`} style={{fontSize:28}}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filters-card">
        <div className="frow">
          <span className="flabel">Bank</span>
          {BANK_CHIPS.map(b => (
            <button key={b.id} className={`chip${selBanks.has(b.id)?' on':''}`} onClick={()=>toggle(selBanks,setSelBanks,b.id)}>{b.label}</button>
          ))}
        </div>
        <div className="frow">
          <span className="flabel">Year</span>
          {YEARS.map(y => (
            <button key={y} className={`chip${selYears.has(y)?' on':''}`} onClick={()=>toggle(selYears,setSelYears,y)}>{y}</button>
          ))}
        </div>
        <div className="frow">
          <span className="flabel">Month</span>
          {MONTHS_SHORT.map((m,i) => (
            <button key={i} className={`chip${selMonths.has(String(i))?' on':''}`} onClick={()=>toggle(selMonths,setSelMonths,String(i))}>{m}</button>
          ))}
        </div>
        <div className="searchrow">
          <input className="search-input" placeholder="Search description or amount (e.g. CRED, Swiggy, 50000)…"
            value={queryLive} onChange={e=>setQueryLive(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&(setQuery(queryLive),runSearch())} />
          <button className="searchbtn" onClick={()=>{setQuery(queryLive);runSearch();}}>Search</button>
          <button className="clearbtn" onClick={reset}>Reset</button>
        </div>
      </div>

      {/* Table */}
      {!isActive && txns.length===0 && (
        <div className="empty-state">Select filters or search to show transactions</div>
      )}
      {loading && <div className="empty-state">Loading…</div>}
      {!loading && txns.length > 0 && (
        <>
          <p className="count"><b>{sortedTxns.length.toLocaleString('en-IN')}</b> transactions</p>
          <div className="tablewrap">
            <table>
              <thead><tr>
                <th onClick={()=>sort('date')}>Date <span className="ar">{ar('date')}</span></th>
                <th>Bank</th>
                <th>Description</th>
                <th>Category</th>
                <th className="r" onClick={()=>sort('sent')} style={{textAlign:'right'}}>Sent <span className="ar">{ar('sent')}</span></th>
                <th className="r" onClick={()=>sort('recv')} style={{textAlign:'right'}}>Received <span className="ar">{ar('recv')}</span></th>
                <th className="r" style={{textAlign:'right'}}>Balance</th>
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
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
