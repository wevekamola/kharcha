import Wordmark from './Wordmark.jsx';

const PAGES = [['dashboard', 'Dashboard'], ['transactions', 'Transactions'], ['settings', 'Settings']];

export default function Nav({ page, setPage, user, onLogout }) {
  const initial = (user?.name || 'A')[0].toUpperCase();
  return (
    <nav className="nav">
      <Wordmark size={24} />
      <div className="nav-links">
        {PAGES.map(([id, lbl]) => (
          <button key={id} className={'nav-link' + (page === id ? ' active' : '')} onClick={() => setPage(id)}>
            {lbl}
          </button>
        ))}
      </div>
      <div className="nav-right">
        <button className="logout" onClick={onLogout}>Log out</button>
        <div className="avatar">{initial}</div>
      </div>
    </nav>
  );
}
