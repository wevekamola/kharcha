import { useState } from 'react';
import Wordmark from '../components/Wordmark.jsx';
import api from '../lib/api.js';
import { useStore } from '../store/useStore.js';

export default function Login() {
  const setAuth = useStore(s => s.setAuth);
  const [email, setEmail]   = useState('admin@kharcha.local');
  const [pw,    setPw]      = useState('');
  const [busy,  setBusy]    = useState(false);
  const [err,   setErr]     = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const { data } = await api.post('/auth/login', { email, password: pw });
      setAuth(data.token, data.user);
    } catch (e) {
      setErr(e.response?.data?.message || 'Login failed');
      setBusy(false);
    }
  };

  return (
    <div className="login-stage">
      <div className="login-grid" />
      <div className="login-glow" />
      <form className={'login-card' + (busy ? ' busy' : '')} onSubmit={submit}>
        <div className="login-brand">
          <Wordmark size={38} />
          <div className="tagline">Know your spend</div>
        </div>

        <label className="field">
          <span className="field-label">Email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required />
        </label>

        <label className="field">
          <span className="field-label">Password</span>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" required />
        </label>

        {err && <div style={{ fontSize: 13, color: 'var(--debit)', textAlign: 'center' }}>{err}</div>}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Sign in'}
        </button>

        <div className="login-foot">Admin access only</div>
      </form>
    </div>
  );
}
