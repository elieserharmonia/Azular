
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Atualiza o estado para que a próxima renderização mostre a UI alternativa.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error (Azular):", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFF] p-8 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm">
            <AlertTriangle size={40} />
          </div>
          <h1 className="text-2xl font-black uppercase text-gray-900 tracking-tighter leading-none">
            Opa, algo azulou...
          </h1>
          <p className="text-gray-500 mt-4 text-sm font-medium leading-relaxed max-w-xs mx-auto">
            Ocorreu um erro inesperado. Isso pode ser um problema de conexão ou carregamento.
          </p>
          
          <div className="mt-6 p-4 bg-white border-2 border-red-50 rounded-3xl text-[10px] text-red-400 font-mono text-left w-full max-w-sm overflow-auto max-h-40 shadow-inner">
            {this.state.error?.toString()}
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="mt-8 bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all"
          >
            <RotateCcw size={18} /> Recarregar App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
