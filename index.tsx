
import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { isAiStudioPreview } from './utils/env';

// Captura imediata de erros no nível global
window.onerror = (msg, source, line, col, error) => {
  const errStr = `Error: ${msg} at ${line}:${col}`;
  (window as any).__AZULAR_BOOT_ERROR__ = errStr;
  localStorage.setItem('azular_boot_error', errStr);
};

/**
 * Registrador de PWA Seguro
 * Valida o ambiente e o arquivo sw.js antes de tentar o registro.
 */
async function registerServiceWorker() {
  if (isAiStudioPreview()) return;
  if (!('serviceWorker' in navigator)) return;

  // Registrar apenas em Vercel ou produção fora do preview
  const isProd = window.location.hostname.includes('vercel.app') || 
                 (window.location.hostname !== 'localhost' && !window.location.hostname.includes('usercontent.goog'));
  
  if (!isProd) return;

  try {
    // Verificação de MIME Type Defensiva
    // Se o sw.js retornar HTML (404 redirecionado), o registro falharia com erro de MIME
    const resp = await fetch('/sw.js', { method: 'HEAD', cache: 'no-store' });
    const contentType = resp.headers.get('content-type');

    if (!resp.ok || !contentType?.includes('javascript')) {
      console.warn('Azular PWA: sw.js não encontrado ou retornando HTML. Registro ignorado.');
      return;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Azular PWA: Service Worker registrado com sucesso:', registration.scope);
  } catch (err) {
    console.warn('Azular PWA: Erro silencioso no registro do SW:', err);
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
    
    // Inicia o processo de registro de forma assíncrona para não bloquear o boot
    registerServiceWorker();

  } catch (err) {
    const errStr = err instanceof Error ? err.message : String(err);
    (window as any).__AZULAR_BOOT_ERROR__ = errStr;
    const msgEl = document.getElementById('boot-msg');
    if (msgEl) msgEl.textContent = 'Falha crítica no início do sistema.';
  }
};

boot();
