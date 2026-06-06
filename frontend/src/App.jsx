import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore.js';
import { useFilters } from './hooks/useFilters.js';
import Nav from './components/Nav.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Transactions from './pages/Transactions.jsx';
import Settings from './pages/Settings.jsx';
import MonthDetail from './pages/MonthDetail.jsx';
import Wordmark from './components/Wordmark.jsx';
import api from './lib/api.js';

function AppLayout() {
  const { token, user, logout, setAccounts, accounts } = useStore(s => ({
    token: s.token, user: s.user, logout: s.logout, setAccounts: s.setAccounts, accounts: s.accounts,
  }));

  const navigate = useNavigate();
  const location = useLocation();
  const { filters, setFilters, range, apiParams } = useFilters();

  useEffect(() => {
    if (!token) return;
    api.get('/accounts').then(r => setAccounts(r.data)).catch(()=>{});
  }, [token]);

  if (!token) return <Login />;

  const handleLogout = () => { logout(); navigate('/overview'); };

  // Determine current page from location
  const currentPage = location.pathname.split('/')[1] || 'overview';
  const isDrilldown = location.pathname.startsWith('/overview/month-detail');

  return (
    <div style={{background:'var(--paper)', minHeight:'100vh'}}>
      {/* Header */}
      <div className="wrap" style={{paddingBottom:24}}>
        {/* Logo + Nav Pills + Logout row */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
          {/* Left: Logo */}
          <Wordmark size={52} />

          {/* Right: Nav Pills + Logout */}
          <div style={{display:'flex',alignItems:'center',gap:24}}>
            {!isDrilldown && (
              <Nav
                page={currentPage}
                setPage={p => navigate(`/${p}`)}
                drillback={null}
              />
            )}
            {!isDrilldown && (
              <button onClick={handleLogout} style={{fontSize:20,padding:'6px 10px',display:'flex',alignItems:'center',justifyContent:'center',border:'none',background:'transparent',color:'var(--muted)',cursor:'pointer',transition:'.15s'}} onMouseEnter={e=>e.target.style.color='var(--ink)'} onMouseLeave={e=>e.target.style.color='var(--muted)'}>
                ⏻
              </button>
            )}
          </div>
        </div>

        {/* Brandsub */}
        <div className="brandsub">
          Track every ₹upee. Understand your money flow.
        </div>

        {/* Border */}
        <div style={{height:'1px',background:'var(--line)',marginTop:24,marginBottom:24}} />
      </div>

      {/* Page content */}
      <Routes>
        <Route path="/overview" element={
          <div className="wrap" style={{paddingTop:0}}>
            <Overview apiParams={apiParams} range={range} onMonthDrill={(bucket) => navigate(`/overview/month-detail?bucket=${bucket.key}`)} />
          </div>
        } />
        <Route path="/overview/month-detail" element={
          <div className="wrap" style={{paddingTop:0}}>
            <MonthDetailWrapper apiParams={apiParams} onBack={() => navigate('/overview')} />
          </div>
        } />
        <Route path="/transactions" element={<Transactions initialParams={null} />} />
        <Route path="/settings" element={<Settings onLogout={handleLogout} />} />
        <Route path="/" element={<Navigate to="/overview" replace />} />
      </Routes>
    </div>
  );
}

function MonthDetailWrapper({ apiParams, onBack }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const bucketKey = params.get('bucket');

  if (!bucketKey) return <div className="empty-state">Invalid drilldown</div>;

  // Reconstruct bucket object from key
  const MONTHS_LONG = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [yr, mo] = bucketKey.split('-').map(Number);
  const bucket = {
    key: bucketKey,
    label: MONTHS_LONG[mo] + " '" + String(yr).slice(2),
    spent: 0,
    received: 0,
  };

  return <MonthDetail bucket={bucket} apiParams={apiParams} onBack={onBack} />;
}

// Import Navigate from react-router-dom
import { Navigate } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
