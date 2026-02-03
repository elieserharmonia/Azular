
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Diagnóstico de inicialização (visível no Logcat do Android Studio)
console.log('Azular: Inicializando aplicação...');
console.log('Azular: Ambiente:', window.location.origin);

// Registro do Service Worker para PWA (apenas se disponível e não for Capacitor)
if ('serviceWorker' in navigator && !window.location.href.includes('android_asset')) {
  window.addEventListener('load', () => {
    try {
      const swUrl = new URL('./sw.js', window.location.href).href;
      navigator.serviceWorker.register(swUrl)
        .then((registration) => {
          console.log('Azular SW registrado:', registration.scope);
        })
        .catch((error) => {
          console.warn('Aviso: SW não registrado:', error.message);
        });
    } catch (err) {
      console.error('Erro SW URL:', err);
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
