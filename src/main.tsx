import './polyfills';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Offline app shell for the installed app (RFC 0008). The worker only caches
// the app's own files; mempool.space requests always go to the network.
// Not registered in development, where Vite serves modules on the fly.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Installing is optional. The page works without the worker.
    });
  });
}
