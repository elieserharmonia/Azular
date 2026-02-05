import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { isPreview } from './utils/env';

// Error tracking for diagnostic box
window.onerror = (msg, source, line, col, error) => {
  const errStr = `Error: ${msg} at ${line}:${col}`;
  (window as any).__AZULAR_BOOT_ERROR__ = errStr;
};

async function registerServiceWorker() {
  // Service workers are typically restricted in preview blob environments
  if (isPreview()) return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const resp = await fetch('/sw.js', { method: 'HEAD', cache: 'no-store' });
    if (!resp.ok || !resp.headers.get('content-type')?.includes('javascript')) {
      return;
    }
    await navigator.serviceWorker.register('/sw.js');
    console.log('Azular SW: Ativo');
  } catch (err) {
    console.error('Azular SW: Falha', err);
  }
}

const boot = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  try {
    const root = createRoot(rootElement);
    
    // Mark boot as OK before render to prevent the timeout in index.html from showing the error UI
    // React 18 render is concurrent, but the execution of index.tsx reaching this point means modules loaded.
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
    
    registerServiceWorker();

  } catch (err) {
    console.error('Root Boot Crash:', err);
    const errStr = err instanceof Error ? err.message : String(err);
    (window as any).__AZULAR_BOOT_ERROR__ = errStr;
    (window as any).__AZULAR_BOOT_OK__ = false;
  }
};

// Execute boot process
boot();