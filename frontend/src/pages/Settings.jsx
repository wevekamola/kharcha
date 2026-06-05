import { useState, useEffect, useRef } from 'react';
import { BANKS, FORMAT_LABELS } from '../config/banks.js';
import { CATEGORIES } from '../config/categories.js';
import { useStore } from '../store/useStore.js';
import api from '../lib/api.js';

const SWATCH_COLORS = ['#1C5B79','#2E7D55','#A9772E','#BD4B2E','#7A7164','#211E18','#6B4F9E'];

function BankModal({ bank, onSave, onClose }) {
  const [name,    setName]    = useState(bank?.name || '');
  const [acctNum, setAcctNum] = useState(bank?.account_number || '');
  const [bankId,  setBankId]  = useState(bank?.bankId || '');
  const [stmtType,setStmtType]= useState(bank?.statementType || 'bank');
  const [color,   setColor]   = useState(bank?.color || SWATCH_COLORS[0]);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  // Auto-set statementType from bankId
  useEffect(() => {
    const b = BANKS.find(b => b.id === bankId);
    if (b) setStmtType(b.statementType);
  }, [bankId]);

  const save = async () => {
    if (!name.trim() || !bankId) { setErr('Name and bank are required.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = { name: name.trim(), account_number: acctNum.trim()||null, bankId, statementType: stmtType, color };
      if (bank?._id) await api.patch(`/accounts/${bank._id}`, payload);
      else await api.post('/accounts', payload);
      onSave();
    } catch(e) {
      setErr(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <h2>{bank?._id ? 'Edit Bank' : 'Add Bank'}</h2>
        <div className="modal-field">
          <label className="modal-label">Name</label>
          <input className="modal-input" placeholder="e.g. HDFC Savings" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div className="modal-field">
          <label className="modal-label">Account Number <span style={{fontWeight:400,textTransform:'none',letterSpacing:0,color:'var(--muted)'}}>— optional</span></label>
          <input className="modal-input" placeholder="e.g. HDFC-09490 or **9490" value={acctNum} onChange={e=>setAcctNum(e.target.value)} />
        </div>
        <div className="modal-field">
          <label className="modal-label">Bank</label>
          <select className="modal-input" value={bankId} onChange={e=>setBankId(e.target.value)}>
            <option value="">Select bank…</option>
            {BANKS.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="modal-field">
          <label className="modal-label">Type</label>
          <select className="modal-input" value={stmtType} onChange={e=>setStmtType(e.target.value)}>
            <option value="bank">Current / Savings</option>
            <option value="credit_card">Credit Card</option>
          </select>
        </div>
        <div className="modal-field">
          <label className="modal-label">Color</label>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {SWATCH_COLORS.map(c=>(
              <button key={c} onClick={()=>setColor(c)} style={{width:26,height:26,borderRadius:'50%',background:c,border:color===c?'2.5px solid var(--ink)':'2px solid transparent',cursor:'pointer'}} />
            ))}
          </div>
        </div>
        {err && <div style={{fontSize:13,color:'var(--sent)',marginTop:4}}>{err}</div>}
        <div className="modal-actions">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-ink" onClick={save} disabled={saving}>{saving?<span className="spinner"/>:(bank?._id?'Save changes':'Add bank')}</button>
        </div>
      </div>
    </div>
  );
}

function UploadSection({ accounts, onUploaded }) {
  const [accountId, setAccountId] = useState('');
  const [format,    setFormat]    = useState('');
  const [file,      setFile]      = useState(null);
  const [over,      setOver]      = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [err,       setErr]       = useState(null);
  const inputRef = useRef(null);

  const acct = accounts.find(a => a._id === accountId);
  const bank = BANKS.find(b => b.id === acct?.bankId);
  const formats = bank?.supportedFormats || [];

  useEffect(() => { setFormat(formats[0]||''); }, [accountId]);

  const submit = async () => {
    if (!accountId) { setErr('Select a bank account.'); return; }
    if (!format)    { setErr('Select a format.'); return; }
    if (!file)      { setErr('Choose a file.'); return; }
    setLoading(true); setResult(null); setErr(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('accountId', accountId);
    fd.append('format', format);
    try {
      const { data } = await api.post('/upload', fd);
      setResult(data); setFile(null);
      onUploaded?.();
    } catch(e) {
      setErr(e.response?.data?.message || 'Upload failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="upload-form">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div className="form-field">
          <label className="form-label">Bank Account</label>
          <select className="form-select" value={accountId} onChange={e=>setAccountId(e.target.value)}>
            <option value="">Select account…</option>
            {accounts.map(a=><option key={a._id} value={a._id}>{a.name}{a.account_number?' ('+a.account_number+')':''}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Format</label>
          <select className="form-select" value={format} onChange={e=>setFormat(e.target.value)} disabled={!formats.length}>
            <option value="">Select format…</option>
            {formats.map(f=><option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
          </select>
        </div>
      </div>

      <div className={`dropzone${over?' over':''}`}
        onClick={()=>inputRef.current?.click()}
        onDragOver={e=>{e.preventDefault();setOver(true);}}
        onDragLeave={()=>setOver(false)}
        onDrop={e=>{e.preventDefault();setOver(false);const f=e.dataTransfer.files[0];if(f){setFile(f);setResult(null);setErr(null);}}}>
        <input ref={inputRef} type="file" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f){setFile(f);setResult(null);setErr(null);}}} />
        <div className="dropzone-icon">📂</div>
        {file ? <div className="dropzone-file">{file.name}</div> :
          <><div className="dropzone-text">Drop file here or click to browse</div><div className="dropzone-sub">.txt · .csv · .xls · .xlsx — max 10 MB</div></>}
      </div>

      <button className="btn-ink" onClick={submit} disabled={loading} style={{width:'100%',padding:12,fontSize:14.5}}>
        {loading ? <span className="spinner"/> : 'Upload Statement'}
      </button>

      {result && <div className="upload-result"><strong>✓ Uploaded</strong> — {result.inserted} new, {result.skipped} duplicates skipped</div>}
      {err    && <div className="upload-result error"><strong>✗ {err}</strong></div>}
    </div>
  );
}

export default function Settings({ onLogout }) {
  const { user, accounts, setAccounts } = useStore(s => ({ user:s.user, accounts:s.accounts, setAccounts:s.setAccounts }));
  const [batches,   setBatches]   = useState([]);
  const [modal,     setModal]     = useState(null); // null | 'create' | bankObject
  const [deleting,  setDeleting]  = useState(false);
  const [delConfirm,setDelConfirm]= useState(false);

  useEffect(() => { api.get('/upload-batches').then(r=>setBatches(r.data)); }, []);

  const refreshAccounts = () => api.get('/accounts').then(r=>setAccounts(r.data));
  const refreshAll = () => { refreshAccounts(); api.get('/upload-batches').then(r=>setBatches(r.data)); };

  const deleteAccount = async id => {
    if (!confirm('Delete this bank? Its transactions will remain.')) return;
    await api.delete(`/accounts/${id}`);
    setAccounts(accounts.filter(a=>a._id!==id));
  };

  const wipeAll = async () => {
    setDeleting(true);
    try {
      await api.delete('/transactions/all');
      setAccounts([]); setBatches([]);
      alert('All data deleted.');
    } finally { setDeleting(false); setDelConfirm(false); }
  };

  const initial = (user?.name||'A')[0].toUpperCase();

  return (
    <div className="wrap-settings">
      {/* Profile */}
      <div className="settings-section">
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:48,height:48,borderRadius:'50%',background:'var(--ink)',color:'var(--paper)',display:'grid',placeItems:'center',fontFamily:'Fraunces,serif',fontSize:22,fontWeight:500}}>{initial}</div>
          <div>
            <div style={{fontSize:16,fontWeight:600}}>{user?.name||'Admin'}</div>
            <div style={{fontSize:13,color:'var(--muted)'}}>{user?.email||'admin@kharcha.local'}</div>
          </div>
          <button className="btn-outline" style={{marginLeft:'auto'}} onClick={onLogout}>Sign out</button>
        </div>
      </div>

      {/* Banks */}
      <div className="settings-section">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
          <div>
            <h2 style={{fontSize:17}}>Banks</h2>
            <p className="sec-sub">{accounts.length} account{accounts.length!==1?'s':''} — used to map uploaded statements</p>
          </div>
          <button className="btn-ink" style={{fontSize:13}} onClick={()=>setModal('create')}>+ Add bank</button>
        </div>
        {accounts.length===0 && <div style={{color:'var(--muted)',fontSize:13}}>No banks yet — add one to get started</div>}
        {accounts.map(a=>(
          <div className="bank-row" key={a._id}>
            <span className="bank-dot" style={{background:a.color}}/>
            <div>
              <div className="bank-name">{a.name}</div>
              <div className="bank-sub">{a.statementType==='credit_card'?'Credit Card':'Current/Savings'}{a.account_number?' · '+a.account_number:''}</div>
            </div>
            <div style={{marginLeft:'auto',display:'flex',gap:8}}>
              <button className="btn-outline" style={{fontSize:12,padding:'6px 12px'}} onClick={()=>setModal(a)}>Edit</button>
              <button className="btn-danger"  style={{fontSize:12,padding:'6px 12px'}} onClick={()=>deleteAccount(a._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload */}
      <div className="settings-section">
        <h2 style={{fontSize:17,marginBottom:4}}>Upload Statement</h2>
        <p className="sec-sub">Import transactions from your bank — create a bank above first</p>
        <UploadSection accounts={accounts} onUploaded={refreshAll} />
      </div>

      {/* Upload history */}
      {batches.length > 0 && (
        <div className="settings-section">
          <h2 style={{fontSize:17,marginBottom:18}}>Upload History</h2>
          {batches.slice(0,20).map(b=>(
            <div className="bank-row" key={b._id}>
              <span className="bank-dot" style={{background:b.status==='completed'?'var(--recv)':'var(--sent)'}}/>
              <div style={{flex:1}}>
                <div className="bank-name" style={{fontSize:13}}>{b.fileName}</div>
                <div className="bank-sub">{b.counts?.inserted} in · {b.counts?.skipped} dup</div>
              </div>
              <div style={{color:'var(--muted)',fontSize:12}}>{new Date(b.uploadedAt).toLocaleDateString('en-IN')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Danger zone */}
      <div className="danger-zone">
        <h2 style={{fontSize:17,color:'var(--sent)',marginBottom:4}}>Danger Zone</h2>
        <p style={{fontSize:12.5,color:'var(--muted)',marginBottom:16,marginTop:0}}>Irreversible — wipes all transactions, batches and accounts</p>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{flex:1,fontSize:13}}>Delete all imported data from the database.</div>
          {!delConfirm
            ? <button className="btn-danger" onClick={()=>setDelConfirm(true)}>Delete all</button>
            : <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:12.5,color:'var(--muted)'}}>Sure?</span>
                <button className="btn-danger" style={{background:'var(--sent)',color:'#fff'}} onClick={wipeAll} disabled={deleting}>
                  {deleting?<span className="spinner" style={{width:14,height:14,borderWidth:2}}/>:'Yes, delete all'}
                </button>
                <button className="btn-outline" onClick={()=>setDelConfirm(false)}>Cancel</button>
              </div>
          }
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <BankModal
          bank={modal==='create' ? null : modal}
          onSave={()=>{ refreshAccounts(); setModal(null); }}
          onClose={()=>setModal(null)}
        />
      )}
    </div>
  );
}
