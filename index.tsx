import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { isPreview } from './utils/env';

const PREVIEW_MODE = isPreview();

// 1. Injeção Dinâmica de Recursos (Apenas Produção)
function bootstrapResources() {
  if (PREVIEW_MODE) return;

  try {
    // Injetar Manifest
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = '/manifest.json';
    document.head.appendChild(manifestLink);
    (window as any).__AZULAR_RESOURCES.manifest = true;

    // Injetar Fonts Externas
    const fontsLink = document.createElement('link');
    fontsLink.rel = 'stylesheet';
    fontsLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap';
    document.head.appendChild(fontsLink);
    (window as any).__AZULAR_RESOURCES.fonts = true;

    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(() => { (window as any).__AZULAR_RESOURCES.sw = true; })
          .catch(err => console.warn('SW registration failed:', err));
      });
    }
  } catch (e) {
    console.error('Error injecting production resources:', e);
  }
}

const renderApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  try {
    const root = createRoot(rootElement);
    
    // Marcar boot como OK
    (window as any).__AZULAR_BOOT_OK__ = true;

    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <HashRouter>
            <App />
          </HashRouter>
        </ErrorBoundary>
      </React.StrictMode>
    );
    
    bootstrapResources();

  } catch (err) {
    console.error('Crash during React boot:', err);
  }
};

renderApp();