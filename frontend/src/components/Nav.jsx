const PAGES = [['overview','Overview'],['transactions','Transactions'],['settings','Settings']];

export default function Nav({ page, setPage, drillback }) {
  return (
    <div style={{display:'flex',justifyContent:'center'}}>
      {drillback ? (
        <button className="nav-link" onClick={drillback}>← Back</button>
      ) : (
        <div className="nav-pills">
          {PAGES.map(([id,lbl]) => (
            <button
              key={id}
              className={'nav-pill'+(page===id?' active':'')}
              onClick={()=>setPage(id)}
            >
              {lbl}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
