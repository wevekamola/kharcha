import { useState, useRef, useEffect } from 'react';
import { isoDate } from '../utils/format.js';
import { PRESETS, presetRange } from '../hooks/useFilters.js';
import { CATEGORIES } from '../config/categories.js';
import { useStore } from '../store/useStore.js';

function Dropdown({ value, children, width = 200 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="dd" ref={ref}>
      <button className={'dd-btn' + (open ? ' open' : '')} onClick={() => setOpen(o => !o)}>
        {value}
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {open && <div className="dd-menu" style={{ minWidth: width }}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

export default function FilterBar({ filters, setFilters, range }) {
  const accounts = useStore(s => s.accounts);
  const [from, to] = range;
  const acct = filters.account === 'all' ? null : accounts.find(a => a._id === filters.account);
  const cat  = filters.category === 'all' ? null : CATEGORIES.find(c => c.id === filters.category);
  const presetLabel = filters.preset === 'custom' ? 'Custom' : (PRESETS.find(p => p[0] === filters.preset) || [])[1];
  const dirty = filters.account !== 'all' || filters.category !== 'all' ||
    filters.preset !== 'custom' || filters.from !== '2025-01-01';

  return (
    <div className="filterbar">
      <div className="fb-dates">
        <Dropdown width={210} value={
          <span className="dd-date">
            <span className="dd-cal">📅</span>
            {presetLabel}
            <span className="dd-range">{isoDate(from).slice(5)} → {isoDate(to).slice(5)}</span>
          </span>
        }>
          {(close) => (
            <>
              {PRESETS.map(([id, lbl]) => (
                <button key={id} className={'dd-item' + (filters.preset === id ? ' sel' : '')}
                  onClick={() => { setFilters(f => ({ ...f, preset: id })); close(); }}>
                  {lbl}
                </button>
              ))}
              <div className="dd-sep" />
              <div className="dd-custom">
                <span>Custom range</span>
                <input type="date" value={isoDate(from)} onChange={e => setFilters(f => ({ ...f, preset: 'custom', from: e.target.value, to: f.preset === 'custom' ? f.to : isoDate(to) }))} />
                <input type="date" value={isoDate(to)}   onChange={e => setFilters(f => ({ ...f, preset: 'custom', to: e.target.value, from: f.preset === 'custom' ? f.from : isoDate(from) }))} />
              </div>
            </>
          )}
        </Dropdown>
      </div>

      <Dropdown width={220} value={
        <span className="dd-acct">
          {acct ? <span className="dot" style={{ background: acct.color }} /> : <span className="dot multi" />}
          {acct ? acct.name : 'All Accounts'}
        </span>
      }>
        {(close) => (
          <>
            <button className={'dd-item' + (filters.account === 'all' ? ' sel' : '')}
              onClick={() => { setFilters(f => ({ ...f, account: 'all' })); close(); }}>
              <span className="dot multi" />All Accounts
            </button>
            {accounts.map(a => (
              <button key={a._id} className={'dd-item' + (filters.account === a._id ? ' sel' : '')}
                onClick={() => { setFilters(f => ({ ...f, account: a._id })); close(); }}>
                <span className="dot" style={{ background: a.color }} />{a.name}
                <span className="dd-tag">{a.statementType === 'credit_card' ? 'CC' : 'Bank'}</span>
              </button>
            ))}
          </>
        )}
      </Dropdown>

      <Dropdown width={200} value={
        <span className="dd-acct">
          {cat ? <span className="dot" style={{ background: cat.color }} /> : <span className="dot multi" />}
          {cat ? cat.name : 'All Categories'}
        </span>
      }>
        {(close) => (
          <>
            <button className={'dd-item' + (filters.category === 'all' ? ' sel' : '')}
              onClick={() => { setFilters(f => ({ ...f, category: 'all' })); close(); }}>
              <span className="dot multi" />All Categories
            </button>
            {CATEGORIES.map(c => (
              <button key={c.id} className={'dd-item' + (filters.category === c.id ? ' sel' : '')}
                onClick={() => { setFilters(f => ({ ...f, category: c.id })); close(); }}>
                <span className="dot" style={{ background: c.color }} />{c.name}
              </button>
            ))}
          </>
        )}
      </Dropdown>

      {dirty && (
        <button className="fb-clear" onClick={() => setFilters({ preset: 'custom', from: '2025-01-01', to: isoDate(new Date()), account: 'all', category: 'all' })}>
          Clear filters
        </button>
      )}
    </div>
  );
}
