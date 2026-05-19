import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence Vite/WebSocket HMR noise in the console for a cleaner user experience
if (typeof window !== 'undefined') {
  const silentWarnings = ['WebSocket', 'vite', 'HMR'];
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && silentWarnings.some(sw => args[0].includes(sw))) return;
    originalWarn(...args);
  };

  const originalError = console.error;
  console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && silentWarnings.some(sw => args[0].includes(sw))) return;
    originalError(...args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason);
    if (silentWarnings.some(sw => msg.includes(sw))) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
