
import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { isAiStudioPreview } from './utils/env';

// Captura imediata de erros
window.onerror = (msg, source, line, col, error) => {
  const errStr = `Error: ${msg} at ${line}:${col}`;
  (window as any).__AZULAR_BOOT_ERROR__ = errStr;
  localStorage.setItem('azular_boot_error', errStr);
};

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

    // Registro do Service Worker apenas em produção real
    if ('serviceWorker' in navigator && !isAiStudioPreview()) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('Azular PWA: SW registrado com sucesso:', registration.scope);
        }).catch(err => {
          console.log('Azular PWA: Falha ao registrar SW:', err);
        });
      });
    }

  } catch (err) {
    const errStr = err instanceof Error ? err.message : String(err);
    (window as any).__AZULAR_BOOT_ERROR__ = errStr;
    const msgEl = document.getElementById('boot-msg');
    if (msgEl) msgEl.textContent = 'Falha crítica no início do sistema.';
  }
};

boot();
