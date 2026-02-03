
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * CAPTURA GLOBAL DE ERROS (Agressiva)
 * Deve ser o primeiro código a rodar.
 */
const saveBootError = (error: any, context: string) => {
  const diag = {
    time: new Date().toISOString(),
    context,
    message: error?.message || String(error),
    stack: error?.stack,
    online: navigator.onLine,
    ua: navigator.userAgent,
    href: window.location.href
  };
  localStorage.setItem('azular_boot_error', JSON.stringify(diag, null, 2));
  console.error(`BOOT ERROR [${context}]:`, error);
};

window.onerror = (message, source, lineno, colno, error) => {
  saveBootError(error || message, 'window.onerror');
};

window.onunhandledrejection = (event) => {
  saveBootError(event.reason, 'unhandledrejection');
};

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

    // Sinaliza ao watchdog no index.html que o React iniciou
    (window as any).__AZULAR_BOOTED__ = true;
    
    // Remove o loader nativo após um breve delay para suavidade
    setTimeout(() => {
      const loader = document.getElementById('boot-loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }
    }, 100);

  } catch (err) {
    saveBootError(err, 'ReactDOM.render');
  }
};

// Inicia o app
initApp();

// Service Worker (Resiliente)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn("SW fail:", e));
  });
}
