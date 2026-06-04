import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Match design: body data-panel="mix" gives glass stat/chart panels, flat everything else
document.body.setAttribute('data-panel', 'mix');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
