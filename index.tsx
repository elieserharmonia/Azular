
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

    // Sinaliza ao watchdog que o React iniciou com sucesso
    (window as any).__AZULAR_BOOTED__ = true;
    
    // Remove o loader com uma transição suave
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
    console.error("Critical React Mount Error:", err);
    // Em caso de erro catastrófico, o watchdog no HTML cuidará da interface de erro
  }
};

// Inicia a aplicação
initApp();

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn("SW registration failed:", err);
    });
  });
}
