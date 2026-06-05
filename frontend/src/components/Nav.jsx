const PAGES = [['overview','Overview'],['transactions','Transactions'],['settings','Settings']];

export default function Nav({ page, setPage, onLogout, drillback }) {
  return (
    <div className="navrow">
      <div className="nav">
        {drillback
          ? <button className="nav-link" onClick={drillback}>← Back</button>
          : PAGES.map(([id,lbl]) => (
              <button key={id} className={'nav-link'+(page===id?' active':'')} onClick={()=>setPage(id)}>{lbl}</button>
            ))
        }
      </div>
      {!drillback && (
        <button className="btn-outline" style={{fontSize:13}} onClick={onLogout}>Sign out</button>
      )}
    </div>
  );
}
