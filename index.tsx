
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// 1. Handlers Globais para capturar erros antes do React montar
window.onerror = (message, source, lineno, colno, error) => {
  console.error("GLOBAL ERROR CAPTURED:", message);
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

window.onunhandledrejection = (event) => {
  console.error("PROMISE REJECTION CAPTURED:", event.reason);
  const diag = {
    message: "Promise Unhandled: " + String(event.reason),
    stack: event.reason?.stack,
    time: new Date().toISOString(),
    env: 'unhandled_rejection'
  };
  localStorage.setItem('azular_last_error', JSON.stringify(diag));
};

// 2. Diagnóstico de inicialização
console.log('Azular: Booting...');
console.log('Azular: Protocol:', window.location.protocol);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// 3. Renderização com Contexto de Roteador
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
