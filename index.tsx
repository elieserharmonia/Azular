
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// 1. CAPTURA GLOBAL IMEDIATA
window.onerror = (message, source, lineno, colno, error) => {
  const diag = {
    type: 'runtime_error',
    message: String(message),
    source,
    lineno,
    colno,
    stack: error?.stack,
    time: new Date().toISOString()
  };
  localStorage.setItem('azular_boot_error', JSON.stringify(diag));
};

window.onunhandledrejection = (event) => {
  const diag = {
    type: 'unhandled_promise',
    reason: String(event.reason),
    time: new Date().toISOString()
  };
  localStorage.setItem('azular_boot_error', JSON.stringify(diag));
};

const initApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <HashRouter>
            <App />
          </HashRouter>
        </ErrorBoundary>
      </React.StrictMode>
    );

    // 2. SINALIZAÇÃO DE SUCESSO
    (window as any).__AZULAR_BOOTED__ = true;
    
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
      type: 'critical_mount_error',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : '',
      time: new Date().toISOString()
    };
    localStorage.setItem('azular_boot_error', JSON.stringify(diag));
    console.error("Critical React Mount Error:", err);
    
    rootElement.innerHTML = `<div style="padding: 40px; text-align: center; font-family: sans-serif;">
      <h2 style="color: #ef4444;">Erro Crítico</h2>
      <p>Não foi possível iniciar a interface.</p>
      <button onclick="window.location.reload()" style="padding: 15px 30px; background: #2563eb; color: white; border: none; border-radius: 12px; font-weight: bold;">Tentar Novamente</button>
    </div>`;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
