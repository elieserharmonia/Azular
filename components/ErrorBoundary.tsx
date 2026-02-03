
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Copy, Terminal } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("CRITICAL APP ERROR:", error, errorInfo);
    
    // Salva o erro para o Diagnóstico persistir após recarregar
    const diag = {
      message: error.message,
      stack: error.stack,
      time: new Date().toISOString(),
      url: window.location.href,
      ua: navigator.userAgent
    };
    localStorage.setItem('azular_last_error', JSON.stringify(diag));
  }

  private copyToClipboard = () => {
    const errorData = localStorage.getItem('azular_last_error');
    if (errorData) {
      navigator.clipboard.writeText(errorData);
      alert("Diagnóstico copiado!");
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFF] p-8 text-center">
          <div className="w-24 h-24 bg-red-100 text-red-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl animate-bounce">
            <AlertTriangle size={48} />
          </div>
          
          <h1 className="text-3xl font-black uppercase text-gray-900 tracking-tighter leading-none mb-4">
            Azular falhou ao iniciar
          </h1>
          
          <p className="text-gray-500 text-sm font-medium max-w-xs mx-auto mb-8">
            Isso geralmente acontece devido a um erro de carregamento no Android ou falta de permissão.
          </p>
          
          <div className="w-full max-w-md bg-gray-900 rounded-[2rem] p-6 text-left mb-8 shadow-2xl overflow-hidden border-4 border-gray-800">
            <div className="flex items-center gap-2 mb-4 text-gray-500 border-b border-gray-800 pb-3">
              <Terminal size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Stack Trace</span>
            </div>
            <pre className="text-red-400 text-[10px] font-mono overflow-auto max-h-40 custom-scrollbar">
              {this.state.error?.stack || this.state.error?.message}
            </pre>
          </div>

          <div className="flex flex-col w-full max-w-xs gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white w-full py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <RotateCcw size={18} /> Tentar Recarregar
            </button>
            
            <button 
              onClick={this.copyToClipboard}
              className="bg-white border-2 border-gray-200 text-gray-600 w-full py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <Copy size={18} /> Copiar Diagnóstico
            </button>
            
            <button 
              onClick={() => { localStorage.clear(); window.location.href = '/'; }}
              className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4 hover:text-red-500"
            >
              Limpar Cache e Resetar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
