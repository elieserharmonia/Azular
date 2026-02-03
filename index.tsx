
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

const initApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <HashRouter>
            <App />
          </HashRouter>
        </ErrorBoundary>
      </React.StrictMode>
    );

    // Marca como boot completo para o watchdog do index.html
    (window as any).__AZULAR_BOOTED__ = true;
    
    // Remove o loader nativo
    const loader = document.getElementById('boot-loader');
    if (loader) {
      setTimeout(() => {
        loader.style.transition = 'opacity 0.5s ease';
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }, 200);
    }

  } catch (err) {
    const diag = {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : '',
      time: new Date().toISOString(),
      ua: navigator.userAgent
    };
    localStorage.setItem('azular_boot_error', JSON.stringify(diag));
    console.error("Critical Boot Error:", err);
  }
};

initApp();

if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
