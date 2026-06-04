import { useState, useEffect, useRef } from 'react';
import { BANKS, FORMAT_LABELS, bankById } from '../../config/banks.js';
import api from '../../lib/api.js';

const SWATCH_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#22d3ee', '#ec4899', '#a855f7'];

export default function StatementUploader({ accounts, onUploaded, onAccountCreated }) {
  const [bankId,    setBankId]    = useState('');
  const [format,    setFormat]    = useState('');
  const [accountId, setAccountId] = useState('');
  const [file,      setFile]      = useState(null);
  const [over,      setOver]      = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [err,       setErr]       = useState(null);

  // New account form
  const [newMode,   setNewMode]   = useState(false);
  const [newName,   setNewName]   = useState('');
  const [newLast4,  setNewLast4]  = useState('');
  const [newColor,  setNewColor]  = useState(SWATCH_COLORS[0]);
  const [creating,  setCreating]  = useState(false);

  const inputRef = useRef(null);
  const bank = bankId ? bankById[bankId] : null;
  const formats = bank?.supportedFormats || [];

  useEffect(() => {
    setFormat(formats[0] || '');
    setAccountId('');
    setNewMode(false);
  }, [bankId]);

  const handleFile = (f) => {
    if (f) { setFile(f); setResult(null); setErr(null); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const createAccount = async () => {
    if (!newName.trim() || !bankId) return;
    setCreating(true);
    try {
      const { data } = await api.post('/accounts', {
        name: newName.trim(),
        bankId,
        statementType: bank.statementType,
        last4: newLast4.trim() || null,
        color: newColor,
      });
      onAccountCreated(data);
      setAccountId(data._id);
      setNewMode(false);
      setNewName(''); setNewLast4(''); setNewColor(SWATCH_COLORS[0]);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const submit = async () => {
    if (!bankId)    { setErr('Select a bank first.');            return; }
    if (!format)    { setErr('Select a format.');                return; }
    if (!accountId) { setErr('Select an account — or choose "+ Create new account" from the dropdown.'); return; }
    if (!file)      { setErr('Drop or choose a file to upload.'); return; }
    if (newMode)    { setErr('Finish creating the account first, then upload.'); return; }
    setLoading(true); setResult(null); setErr(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('bankId', bankId);
    fd.append('format', format);
    fd.append('accountId', accountId);
    try {
      const { data } = await api.post('/upload', fd);
      setResult(data);
      setFile(null);
      onUploaded?.();
    } catch (e) {
      setErr(e.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-form">
      {/* Row 1: bank + format */}
      <div className="upload-selects">
        <div className="form-field">
          <label className="form-label">Bank / Card</label>
          <select className="form-select" value={bankId} onChange={e => setBankId(e.target.value)}>
            <option value="">Select bank…</option>
            {BANKS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Format</label>
          <select className="form-select" value={format} onChange={e => setFormat(e.target.value)} disabled={!formats.length}>
            {formats.map(f => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2: account */}
      {bankId && (
        <div className="form-field">
          <label className="form-label">Account</label>
          <select className="form-select" value={accountId} onChange={e => { if (e.target.value === '__new__') setNewMode(true); else { setAccountId(e.target.value); setNewMode(false); } }}>
            <option value="">Select account…</option>
            {accounts.filter(a => a.bankId === bankId).map(a => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
            <option value="__new__">+ Create new account</option>
          </select>
        </div>
      )}

      {/* New account inline form */}
      {newMode && (
        <div className="add-acct-form">
          <div className="form-field" style={{ flex: 2 }}>
            <label className="form-label">Account name</label>
            <input className="form-input" placeholder={`e.g. ${bank?.name} Savings`} value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <div className="form-field" style={{ flex: '0 0 90px' }}>
            <label className="form-label">Last 4 digits</label>
            <input className="form-input" placeholder="9490" maxLength={4} value={newLast4} onChange={e => setNewLast4(e.target.value)} />
          </div>
          <div className="form-field" style={{ flex: '0 0 auto' }}>
            <label className="form-label">Color</label>
            <div className="color-swatches">
              {SWATCH_COLORS.map(c => (
                <button key={c} className={'color-swatch' + (newColor === c ? ' sel' : '')} style={{ background: c }} onClick={() => setNewColor(c)} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
            <button className="btn-sm" onClick={createAccount} disabled={creating || !newName.trim()}>
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button className="btn-sm ghost" onClick={() => { setNewMode(false); setAccountId(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        className={'dropzone' + (over ? ' over' : '')}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={handleDrop}
      >
        <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        <div className="dropzone-icon">📂</div>
        {file
          ? <div className="dropzone-file">{file.name}</div>
          : <>
              <div className="dropzone-text">Drop file here or click to browse</div>
              <div className="dropzone-sub">Supports .txt, .csv, .xls, .xlsx — max 10MB</div>
            </>
        }
      </div>

      {/* Submit */}
      <button className="btn-primary" onClick={submit}
        disabled={loading}
        style={{ marginTop: 0 }}>
        {loading ? <span className="spinner" /> : 'Upload Statement'}
      </button>

      {/* Result */}
      {result && (
        <div className="upload-result">
          <strong>✓ Uploaded successfully</strong> — {result.inserted} new, {result.skipped} duplicates skipped (total {result.total})
        </div>
      )}
      {err && (
        <div className="upload-result error">
          <strong>✗ Error</strong> — {err}
        </div>
      )}
    </div>
  );
}
