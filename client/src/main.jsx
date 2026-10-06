import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { reloadOnServiceWorkerUpdate } from './lib/swUpdate.js';
import { initAnalytics } from './lib/analytics.js';

// Swap to a new deploy on this load rather than the next one.
reloadOnServiceWorkerUpdate();

// Inert unless VITE_GA_ID is set (and the visitor hasn't set Do Not Track).
initAnalytics();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
