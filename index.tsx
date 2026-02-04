
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Captura imediata de erros antes de qualquer import pesado
window.onerror = (msg, source, line, col, error) => {
  const errStr = `Error: ${msg} at ${line}:${col}`;
  (window as any).__AZULAR_BOOT_ERROR__ = errStr;
  localStorage.setItem('azular_boot_error', errStr);
};

window.onunhandledrejection = (event) => {
  const errStr = `Promise Rejection: ${event.reason}`;
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
    
    // Sinaliza sucesso para o watchdog do index.html
    (window as any).__AZULAR_BOOT_OK__ = true;
    console.log("Azular: React Boot OK");

  } catch (err) {
    const errStr = err instanceof Error ? err.message : String(err);
    (window as any).__AZULAR_BOOT_ERROR__ = errStr;
    
    // Fallback visual imediato em caso de erro no render
    const msgEl = document.getElementById('boot-msg');
    if (msgEl) msgEl.textContent = 'Falha crítica no início do React.';
    const btn = document.getElementById('boot-diag-btn');
    if (btn) btn.style.display = 'block';
  }
};

boot();
