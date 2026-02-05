import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Copy, Trash2 } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Fix: Use explicit Component inheritance and a constructor to ensure 'props' is recognized by the compiler
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    // Captura erros de promessas canceladas ou falhas de import
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error);
    
    // Ignorar erros irrelevantes de extensões ou cancelamentos de navegação
    if (error.message?.includes("Canceled") || error.message?.includes("cancel")) {
      return;
    }

    const diag = {
      message: error.message,
      stack: error.stack,
      info: errorInfo,
      time: new Date().toISOString(),
      url: window.location.href
    };
    localStorage.setItem('azular_last_error', JSON.stringify(diag));
  }

  private resetApp = () => {
    // Limpeza profunda em caso de erro persistente
    localStorage.clear();
    sessionStorage.clear();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (let reg of regs) reg.unregister();
      });
    }
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    window.location.href = window.location.origin;
  };

  private copyDiag = () => {
    const diag = localStorage.getItem('azular_last_error');
    if (diag) {
      navigator.clipboard.writeText(diag);
      alert("Diagnóstico copiado!");
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFF] p-8 text-center">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mb-8">
            <AlertTriangle size={40} />
          </div>
          
          <h1 className="text-2xl font-black uppercase text-gray-900 tracking-tighter mb-4">
            Ajuste Necessário
          </h1>
          
          <p className="text-gray-500 text-sm font-medium max-w-xs mx-auto mb-8">
            Encontramos um obstáculo técnico. Tente recarregar ou limpar os dados locais.
          </p>
          
          <div className="flex flex-col w-full max-w-xs gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <RotateCcw size={18} /> Recarregar Sistema
            </button>
            
            <button 
              onClick={this.resetApp}
              className="mt-4 text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Trash2 size={12} /> Limpar Tudo e Reiniciar
            </button>
          </div>
        </div>
      );
    }

    // Fix: access children from this.props which is now correctly inherited
    return this.props.children || null;
  }
}

export default ErrorBoundary;