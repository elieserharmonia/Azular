
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

/**
 * Registro do Service Worker de forma resiliente.
 * Usamos caminhos relativos diretos ('./sw.js') que são resolvidos nativamente pelo navegador.
 * Isso evita erros de construção manual de URLs que frequentemente falham em ambientes 
 * de pré-visualização ou sandboxes de desenvolvimento.
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('Azular: Service Worker registrado. Escopo:', reg.scope);
      })
      .catch(err => {
        // Erros de SecurityError acontecem se não estiver em HTTPS ou localhost.
        // Outros erros podem ocorrer se o sw.js não for encontrado no caminho relativo.
        if (err.name === 'SecurityError') {
          console.warn('Azular: SW bloqueado por segurança (HTTPS/Localhost necessário).');
        } else {
          console.error('Azular: Falha ao registrar Service Worker:', err);
        }
      });
  });
}

/**
 * Monitoramento global de erros para telemetria local e diagnóstico do usuário.
 * Salva o último erro no localStorage para ser exibido na tela de Erro ou Diagnóstico.
 */
window.onerror = (message, source, lineno, colno, error) => {
  try {
    const diag = {
      message: String(message),
      source,
      lineno,
      colno,
      stack: error?.stack,
      time: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    localStorage.setItem('azular_last_error', JSON.stringify(diag));
  } catch (e) {
    console.error("Erro ao salvar diagnóstico local:", e);
  }
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Elemento raiz 'root' não encontrado no DOM.");
}

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
