import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { reloadOnServiceWorkerUpdate } from './lib/swUpdate.js';

// Swap to a new deploy on this load rather than the next one.
reloadOnServiceWorkerUpdate();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
