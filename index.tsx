import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { isAiStudioPreview } from './utils/env';

window.onerror = (msg, source, line, col, error) => {
  const errStr = `Error: ${msg} at ${line}:${col}`;
  (window as any).__AZULAR_BOOT_ERROR__ = errStr;
};

async function registerServiceWorker() {
  if (isAiStudioPreview()) return;
  if (!('serviceWorker' in navigator)) return;

  try {
    // Verifica se o sw.js existe e é JS (evita registrar 404 HTML da Vercel)
    const resp = await fetch('/sw.js', { method: 'HEAD', cache: 'no-store' });
    if (!resp.ok || !resp.headers.get('content-type')?.includes('javascript')) {
      console.warn('Azular: sw.js inválido ou inexistente.');
      return;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    
    // Check for updates
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (installingWorker) {
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('Azular: Nova versão disponível! Recarregue.');
            // Opcional: mostrar um toast "Nova versão disponível"
          }
        };
      }
    };

    console.log('Azular SW: Ativo em', registration.scope);
  } catch (err) {
    console.error('Azular SW: Falha no registro:', err);
  }
}

const boot = () => {
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
    
    (window as any).__AZULAR_BOOT_OK__ = true;
    registerServiceWorker();

  } catch (err) {
    const errStr = err instanceof Error ? err.message : String(err);
    (window as any).__AZULAR_BOOT_ERROR__ = errStr;
  }
};

boot();