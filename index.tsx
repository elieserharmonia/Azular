
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Para evitar erros de "Origin mismatch" em ambientes de preview (como o AI Studio),
    // resolvemos explicitamente a URL do script em relação à origem da página atual.
    try {
      const swUrl = new URL('./sw.js', window.location.href).href;
      
      navigator.serviceWorker.register(swUrl)
        .then((registration) => {
          console.log('Azular SW registrado com sucesso:', registration.scope);
        })
        .catch((error) => {
          // Em ambientes de desenvolvimento ou frames protegidos, o registro do SW pode falhar.
          // Tratamos como um aviso para não interromper a execução principal do app.
          console.warn('Aviso: Registro do Service Worker não concluído (comum em previews):', error.message);
        });
    } catch (err) {
      console.error('Erro ao processar a URL do Service Worker:', err);
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
    <App />
  </React.StrictMode>
);
