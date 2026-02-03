
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

    // Sinaliza ao watchdog que o JS carregou e o React montou
    (window as any).__AZULAR_BOOTED__ = true;
    
    // Remove o loader com transição
    const loader = document.getElementById('boot-loader');
    if (loader) {
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => {
          if (loader.parentNode) loader.remove();
        }, 500);
      }, 300);
    }

  } catch (err) {
    const diag = {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : '',
      time: new Date().toISOString()
    };
    localStorage.setItem('azular_last_error', JSON.stringify(diag));
    console.error("Critical React Error:", err);
  }
};

initApp();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
