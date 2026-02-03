
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Registro do Service Worker usando caminho relativo para evitar erro de Cross-Origin
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Azular: SW registrado com sucesso no escopo:', reg.scope))
      .catch(err => console.error('Azular: SW falhou no registro:', err));
  });
}

// Handlers Globais para capturar erros
window.onerror = (message, source, lineno, colno, error) => {
  const diag = {
    message: String(message),
    source,
    lineno,
    colno,
    stack: error?.stack,
    time: new Date().toISOString(),
    env: 'global_handler'
  };
  localStorage.setItem('azular_last_error', JSON.stringify(diag));
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element missing");

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
