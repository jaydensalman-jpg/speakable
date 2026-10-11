import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { reloadOnServiceWorkerUpdate } from './lib/swUpdate.js';
import { initAnalytics } from './lib/analytics.js';
import { captureSource } from './lib/source.js';
import { retryPendingLead } from './lib/leads.js';

// Swap to a new deploy on this load rather than the next one.
reloadOnServiceWorkerUpdate();

// Inert unless VITE_GA_ID is set (and the visitor hasn't set Do Not Track).
initAnalytics();

// Remember which link brought this visitor (?utm_source=…), then resend an
// email-gate signup that failed to reach the server last time.
captureSource();
retryPendingLead();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
