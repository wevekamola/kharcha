import { useState, useEffect } from 'react';
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

export default function App() {
  const { token, user, logout, setAccounts } = useStore(s => ({
    token: s.token, user: s.user, logout: s.logout, setAccounts: s.setAccounts,
  }));

  const [page, setPage]         = useState('overview');
  const [drilldown, setDrilldown] = useState(null);
  const { filters, setFilters, range, apiParams } = useFilters();

  useEffect(() => {
    if (!token) return;
    api.get('/accounts').then(r => setAccounts(r.data)).catch(()=>{});
  }, [token]);

  if (!token) return <Login />;

  const handleLogout = () => { logout(); setPage('overview'); };

  return (
    <div style={{background:'var(--paper)', minHeight:'100vh'}}>
      {/* Header */}
      <div className="wrap" style={{paddingBottom:0}}>
        <Wordmark />
        <div style={{fontSize:13.5,color:'var(--muted)',letterSpacing:'.01em',marginBottom:18}}>
          Know your spend
        </div>
        <Nav
          page={page}
          setPage={p => { setPage(p); setDrilldown(null); }}
          onLogout={handleLogout}
          drillback={drilldown ? () => setDrilldown(null) : null}
        />
      </div>

      {/* Page content */}
      {page === 'overview' && (
        <div className="wrap" style={{paddingTop:0}}>
          {drilldown
            ? <MonthDetail bucket={drilldown} apiParams={apiParams} onBack={()=>setDrilldown(null)} />
            : <Overview apiParams={apiParams} range={range} onMonthDrill={setDrilldown} />
          }
        </div>
      )}
      {page === 'transactions' && (
        <Transactions initialParams={null} />
      )}
      {page === 'settings' && (
        <Settings onLogout={handleLogout} />
      )}
    </div>
  );
}
