import { useState, useEffect, useMemo } from 'react';
import CashFlowChart from '../components/charts/CashFlowChart.jsx';
import { catById } from '../config/categories.js';
import { fmtL, fmtR, isoDate } from '../utils/format.js';
import { useStore } from '../store/useStore.js';
import api from '../lib/api.js';

const MONTHS_LONG = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const RECV = '#2E7D55', SENT = '#BD4B2E';

function monthBuckets(from, to) {
  const out = []; let d = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (d <= end) {
    out.push({ key: d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'), label: MONTHS_LONG[d.getMonth()]+" '"+String(d.getFullYear()).slice(2), spent:0, received:0 });
    d = new Date(d.getFullYear(), d.getMonth()+1, 1);
  }
  return out;
}

export default function Overview({ apiParams, range, onMonthDrill }) {
  const accounts = useStore(s => s.accounts);
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [byCat, setByCat] = useState([]);
  const [topTxns, setTopTxns] = useState({ received: [], sent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/transactions/summary', { params: apiParams }),
      api.get('/transactions/timeline', { params: { ...apiParams, groupBy:'month' } }),
      api.get('/transactions/by-category', { params: apiParams }),
      api.get('/transactions', { params: { ...apiParams, limit: 15, type: 'credit' } }),
      api.get('/transactions', { params: { ...apiParams, limit: 15, type: 'debit' } }),
    ]).then(([s,t,c,recv,sent]) => {
      setSummary(s.data);
      setTimeline(t.data);
      setByCat(c.data);
      setTopTxns({ received: recv.data.transactions, sent: sent.data.transactions });
    }).finally(() => setLoading(false));
  }, [JSON.stringify(apiParams)]);

  const cashflow = useMemo(() => {
    const buckets = monthBuckets(range[0], range[1]);
    const map = Object.fromEntries(buckets.map(b => [b.key, b]));
    timeline.forEach(row => {
      const k = row._id;
      if (map[k]) { map[k].spent += (row.totalDebit||0); map[k].received += (row.totalCredit||0); }
    });
    return buckets;
  }, [timeline, range]);

  // By year
  const byYear = useMemo(() => {
    const m = {};
    cashflow.forEach(b => {
      const yr = b.key.split('-')[0];
      if (!m[yr]) m[yr] = { received:0, spent:0 };
      m[yr].received += b.received; m[yr].spent += b.spent;
    });
    return Object.entries(m).map(([yr,v]) => ({ yr, ...v, net: v.received - v.spent })).sort((a,b)=>a.yr.localeCompare(b.yr));
  }, [cashflow]);

  const maxYr = Math.max(1, ...byYear.flatMap(r => [r.received, r.spent]));

  // By category
  const catSlices = useMemo(() => byCat.map(row => {
    const meta = catById[row._id] || { name: row._id, color: '#C7BDAA' };
    return { id: row._id, name: meta.name, color: meta.color, value: row.total };
  }), [byCat]);
  const maxCat = Math.max(1, ...catSlices.map(c => c.value));

  const acctById = Object.fromEntries(accounts.map(a => [String(a._id), a]));
  const net = (summary?.totalCredit||0) - (summary?.totalDebit||0);

  return (
    <div>
      {/* Stat cards */}
      <div className="cards">
        {[
          {lbl:'Received', val: fmtL(summary?.totalCredit||0), cls:'up', meta:(summary?.credits||0)+' credits'},
          {lbl:'Spent',     val: fmtL(summary?.totalDebit||0),  cls:'down', meta:(summary?.debits||0)+' debits'},
          {lbl:'Net',      val:(net>=0?'+':'-')+fmtL(Math.abs(net)), cls:net>=0?'up':'down', meta:net>=0?'surplus':'deficit'},
          {lbl:'Transactions', val:(summary?.count||0).toLocaleString('en-IN'), cls:'', meta:'in period'},
        ].map((c,i) => (
          <div key={i} className="card rise" style={{animationDelay:`.${10+i*6}s`}}>
            <div className="lbl">{c.lbl}</div>
            <div className={`val num ${c.cls}`}>{c.val}</div>
            <div className="meta">{c.meta}</div>
          </div>
        ))}
      </div>

      {/* Cash flow */}
      <div className="panel rise" style={{animationDelay:'.34s'}}>
        <h2>Monthly Cash Flow</h2>
        <p className="note">Received vs sent per month — click a bar to drill in</p>
        <div className="legend">
          <span><span className="dot" style={{background:RECV}}/>Received</span>
          <span><span className="dot" style={{background:SENT}}/>Spent</span>
        </div>
        <CashFlowChart data={cashflow} accent={SENT} recvColor={RECV} onBarClick={onMonthDrill} />
      </div>

      {/* By year + where money went */}
      <div className="grid2">
        <div className="panel">
          <h2>By Year</h2>
          {byYear.map(r => (
            <div className="yearrow" key={r.yr}>
              <div className="yr">{r.yr}</div>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:4,margin:'0 14px'}}>
                <div className="track"><div className="fill" style={{width:`${r.received/maxYr*100}%`,background:RECV}}/></div>
                <div className="track"><div className="fill" style={{width:`${r.spent/maxYr*100}%`,background:SENT}}/></div>
              </div>
              <div className="num" style={{fontSize:13,color:r.net>=0?RECV:SENT,minWidth:70,textAlign:'right'}}>
                {r.net>=0?'+':'-'}{fmtL(Math.abs(r.net))}
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <h2>Where money went</h2>
          {catSlices.slice(0,8).map(c => (
            <div className="catrow" key={c.id}>
              <div className="cat-lbl">{c.name}</div>
              <div className="track" style={{margin:0}}><div className="fill" style={{width:`${c.value/maxCat*100}%`,background:SENT}}/></div>
              <div className="cat-amt">{fmtR(c.value)}</div>
            </div>
          ))}
          {catSlices.length === 0 && <div style={{color:'var(--muted)',fontSize:13}}>No data</div>}
        </div>
      </div>

      {/* Top transactions */}
      <div className="grid2">
        {[
          { title:'Largest received', rows: topTxns.received, isRecv: true },
          { title:'Largest sent',     rows: topTxns.sent,     isRecv: false },
        ].map(({ title, rows, isRecv }) => (
          <div className="panel" key={title}>
            <h2>{title}</h2>
            <table>
              <thead><tr>
                <th>Date</th><th>Bank</th><th style={{textAlign:'right'}}>Amount</th><th>Description</th>
              </tr></thead>
              <tbody>
                {rows.map(t => {
                  const acct = acctById[String(t.accountId)];
                  const bankId = acct?.bankId || '';
                  const amt = isRecv ? t.credit : t.debit;
                  return (
                    <tr key={t._id}>
                      <td className="num" style={{whiteSpace:'nowrap',fontSize:12}}>{new Date(t.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'})}</td>
                      <td><span className={`bank-pill bank-${bankId} ${!bankId?'bank-default':''}`}>{bankId.replace('_BANK','').replace('_CC',' CC')}</span></td>
                      <td className={`num ${isRecv?'amt-in':'amt-out'}`} style={{textAlign:'right'}}>{fmtR(amt)}</td>
                      <td style={{color:'var(--muted)',fontSize:12,maxWidth:200,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                        {t.parsedNarration?.merchantName || t.rawNarration?.slice(0,40)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
