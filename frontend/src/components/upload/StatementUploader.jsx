import { useState, useEffect, useRef } from 'react';
import { BANKS, FORMAT_LABELS } from '../../config/banks.js';
import api from '../../lib/api.js';

const TYPE_OPTIONS = [
  { value: 'bank',        label: 'Current',  hint: 'Bank / savings / debit / UPI' },
  { value: 'credit_card', label: 'Credit',   hint: 'Credit card statement' },
];

export default function StatementUploader({ onUploaded }) {
  const [stmtType, setStmtType] = useState('');
  const [bankId,   setBankId]   = useState('');
  const [format,   setFormat]   = useState('');
  const [file,     setFile]     = useState(null);
  const [over,     setOver]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [err,      setErr]      = useState(null);

  const inputRef = useRef(null);

  const filteredBanks = BANKS.filter(b => b.statementType === stmtType);
  const bank          = filteredBanks.find(b => b.id === bankId);
  const formats       = bank?.supportedFormats || [];

  useEffect(() => { setBankId(''); setFormat(''); },        [stmtType]);
  useEffect(() => { setFormat(formats[0] || ''); }, [bankId]);

  const handleFile = (f) => { if (f) { setFile(f); setResult(null); setErr(null); } };
  const handleDrop = (e) => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files[0]); };

  const submit = async () => {
    if (!stmtType) { setErr('Select Current or Credit first.'); return; }
    if (!bankId)   { setErr('Select a bank.');                   return; }
    if (!format)   { setErr('Select a format.');                 return; }
    if (!file)     { setErr('Drop or choose a file to upload.'); return; }

    setLoading(true); setResult(null); setErr(null);
    const fd = new FormData();
    fd.append('file',          file);
    fd.append('bankId',        bankId);
    fd.append('statementType', stmtType);
    fd.append('format',        format);

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
      {/* 3-column row: type · bank · format */}
      <div className="upload-selects">
        <div className="form-field">
          <label className="form-label">Statement Type</label>
          <select className="form-select" value={stmtType} onChange={e => setStmtType(e.target.value)}>
            <option value="">Select type…</option>
            {TYPE_OPTIONS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {stmtType && (
            <span style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>
              {TYPE_OPTIONS.find(t => t.value === stmtType)?.hint}
            </span>
          )}
        </div>

        <div className="form-field">
          <label className="form-label">Bank / Card</label>
          <select className="form-select" value={bankId} onChange={e => setBankId(e.target.value)} disabled={!stmtType}>
            <option value="">Select bank…</option>
            {filteredBanks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Format</label>
          <select className="form-select" value={format} onChange={e => setFormat(e.target.value)} disabled={!formats.length}>
            <option value="">Select format…</option>
            {formats.map(f => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
          </select>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={'dropzone' + (over ? ' over' : '')}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={handleDrop}
      >
        <input ref={inputRef} type="file" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])} />
        <div className="dropzone-icon">📂</div>
        {file
          ? <div className="dropzone-file">{file.name}</div>
          : <>
              <div className="dropzone-text">Drop file here or click to browse</div>
              <div className="dropzone-sub">Supports .txt · .csv · .xls · .xlsx — max 10 MB</div>
            </>
        }
      </div>

      <button className="btn-primary" onClick={submit} disabled={loading} style={{ marginTop: 0 }}>
        {loading ? <span className="spinner" /> : 'Upload Statement'}
      </button>

      {result && (
        <div className="upload-result">
          <strong>✓ Uploaded</strong> — {result.inserted} new transactions, {result.skipped} duplicates skipped
          {result.account && (
            <span style={{ color: 'var(--text-dim)' }}> · saved to <b style={{ color: 'var(--text)' }}>{result.account.name}</b></span>
          )}
        </div>
      )}
      {err && (
        <div className="upload-result error">
          <strong>✗ {err}</strong>
        </div>
      )}
    </div>
  );
}
