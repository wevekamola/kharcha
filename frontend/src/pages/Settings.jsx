import { useState, useEffect } from 'react';
import { CATEGORIES } from '../config/categories.js';
import { useStore } from '../store/useStore.js';
import StatementUploader from '../components/upload/StatementUploader.jsx';
import api from '../lib/api.js';

export default function Settings({ onLogout }) {
  const { user, accounts, setAccounts } = useStore(s => ({
    user:        s.user,
    accounts:    s.accounts,
    setAccounts: s.setAccounts,
  }));
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    api.get('/upload-batches').then(r => setBatches(r.data));
  }, []);

  const refreshAll = () => {
    api.get('/accounts').then(r => setAccounts(r.data));
    api.get('/upload-batches').then(r => setBatches(r.data));
  };

  const initial = (user?.name || 'A')[0].toUpperCase();

  return (
    <div className="settings-grid">

      {/* Profile */}
      <div className="panel glass">
        <div className="profile">
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>{initial}</div>
          <div>
            <div className="pname">{user?.name || 'Admin'}</div>
            <div className="pmail">{user?.email || 'admin@kharcha.local'}</div>
          </div>
          <button className="logout" style={{ marginLeft: 'auto' }} onClick={onLogout}>Sign out</button>
        </div>
        <p className="hint" style={{ marginTop: 18 }}>
          Single-user workspace. {accounts.length} linked account{accounts.length !== 1 ? 's' : ''} — accounts are created automatically when you upload a statement.
        </p>
      </div>

      {/* Linked accounts (auto-created) */}
      <div className="panel glass">
        <div className="panel-head">
          <div><h3>Accounts</h3><p className="panel-sub">Auto-created on first upload</p></div>
        </div>
        {accounts.length === 0 && (
          <div className="empty">No accounts yet — upload a statement below to get started</div>
        )}
        {accounts.map(a => (
          <div className="set-row" key={a._id}>
            <span className="dot" style={{ background: a.color, width: 11, height: 11 }} />
            <span className="name">{a.name}</span>
            <span className="meta">{a.statementType === 'credit_card' ? 'Credit' : 'Current'}</span>
          </div>
        ))}
      </div>

      {/* Upload statement */}
      <div className="panel glass" style={{ gridColumn: '1 / -1' }}>
        <div className="panel-head">
          <div><h3>Upload Statement</h3><p className="panel-sub">Import transactions from your bank</p></div>
        </div>
        <StatementUploader onUploaded={refreshAll} />
      </div>

      {/* Categories reference */}
      <div className="panel glass" style={{ gridColumn: '1 / -1' }}>
        <div className="panel-head">
          <div><h3>Categories</h3><p className="panel-sub">{CATEGORIES.length} active</p></div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {CATEGORIES.map(c => (
            <span key={c.id} className="cat-pill"
              style={{ background: c.color + '22', color: c.color, padding: '7px 13px', fontSize: 13 }}>
              {c.icon} {c.name}
            </span>
          ))}
        </div>
      </div>

      {/* Upload history */}
      {batches.length > 0 && (
        <div className="panel glass" style={{ gridColumn: '1 / -1' }}>
          <div className="panel-head">
            <div><h3>Upload History</h3><p className="panel-sub">{batches.length} import{batches.length !== 1 ? 's' : ''}</p></div>
          </div>
          {batches.slice(0, 20).map(b => (
            <div className="set-row" key={b._id}>
              <span className="dot" style={{ background: b.status === 'completed' ? 'var(--credit)' : 'var(--debit)' }} />
              <span className="name" style={{ flex: 1 }}>{b.fileName}</span>
              <span className="meta">{b.counts?.inserted} in · {b.counts?.skipped} dup</span>
              <span className="meta">{new Date(b.uploadedAt).toLocaleDateString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
