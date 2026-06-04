import { useState, useEffect } from 'react';
import { useStore } from './store/useStore.js';
import { useFilters } from './hooks/useFilters.js';
import Nav from './components/Nav.jsx';
import FilterBar from './components/FilterBar.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Settings from './pages/Settings.jsx';
import MonthDetail from './pages/MonthDetail.jsx';
import api from './lib/api.js';

export default function App() {
  const { token, user, logout, setAccounts } = useStore(s => ({
    token:       s.token,
    user:        s.user,
    logout:      s.logout,
    setAccounts: s.setAccounts,
  }));

  const [page, setPage] = useState('dashboard');
  const [drilldown, setDrilldown] = useState(null);
  const { filters, setFilters, range, apiParams } = useFilters();

  // Pre-fetch accounts whenever we have a token
  useEffect(() => {
    if (!token) return;
    api.get('/accounts').then(r => setAccounts(r.data)).catch(() => {});
  }, [token]);

  if (!token) return <Login />;

  const handleLogout = () => { logout(); setPage('dashboard'); };

  return (
    <div className="app">
      <Nav page={page} setPage={setPage} user={user} onLogout={handleLogout} />
      <div className="main">
        {page !== 'settings' && (
          <FilterBar filters={filters} setFilters={setFilters} range={range} />
        )}
        <div className="page" key={drilldown ? drilldown.key : page}>
          {drilldown
            ? <MonthDetail bucket={drilldown} apiParams={apiParams} onBack={() => setDrilldown(null)} />
            : <>
                {page === 'dashboard'    && <Dashboard     apiParams={apiParams} range={range} setFilters={setFilters} onMonthDrill={setDrilldown} />}
                {page === 'transactions' && <Transactions  apiParams={apiParams} />}
                {page === 'settings'     && <Settings      onLogout={handleLogout} />}
              </>
          }
        </div>
      </div>
    </div>
  );
}
