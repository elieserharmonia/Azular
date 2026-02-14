
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, ChevronLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  routeName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RouteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[RouteErrorBoundary] Error in route "${this.props.routeName}":`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-gray-900 mb-2">
            Ops, não consegui abrir esta tela
          </h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest max-w-xs mb-8">
            Ocorreu um erro ao carregar a página de {this.props.routeName}.
          </p>
          
          <div className="flex flex-col w-full max-w-xs gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RotateCcw size={14} /> Recarregar Agora
            </button>
            <button 
              onClick={() => window.history.back()}
              className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2 py-2"
            >
              <ChevronLeft size={12} /> Voltar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
