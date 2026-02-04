
import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Copy, Trash2 } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Explicitly using React.Component with Props and State generics to ensure inheritance of state and props.
class ErrorBoundary extends React.Component<Props, State> {
  // Explicitly declaring state to ensure the compiler recognizes it as a member of the class.
  public state: State = {
    hasError: false,
    error: null
  };

  // FIX: Explicitly declaring props to resolve "Property 'props' does not exist on type 'ErrorBoundary'" error.
  // This ensures the TypeScript compiler correctly identifies the inherited props member in this execution context.
  public props: Props;

  constructor(props: Props) {
    super(props);
    // Initializing state in the constructor for class component standards and compatibility.
    this.state = {
      hasError: false,
      error: null
    };
    // FIX: Assigning props locally to this.props for environment compatibility.
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
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
    localStorage.clear();
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    window.location.reload();
  };

  private copyDiag = () => {
    const diag = localStorage.getItem('azular_last_error');
    if (diag) {
      navigator.clipboard.writeText(diag);
      alert("Diagnóstico copiado!");
    }
  };

  public render() {
    // Correctly accessing state inherited from React.Component after explicit declaration.
    const { hasError } = this.state;

    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFF] p-8 text-center">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mb-8 animate-pulse">
            <AlertTriangle size={40} />
          </div>
          
          <h1 className="text-2xl font-black uppercase text-gray-900 tracking-tighter mb-4">
            Ops, o Azular parou
          </h1>
          
          <p className="text-gray-500 text-sm font-medium max-w-xs mx-auto mb-8">
            Houve um erro inesperado. Tente recarregar ou limpar o cache se o problema persistir.
          </p>
          
          <div className="flex flex-col w-full max-w-xs gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <RotateCcw size={18} /> Tentar Recarregar
            </button>
            
            <button 
              onClick={this.copyDiag}
              className="bg-white border-2 border-gray-100 text-gray-600 w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              <Copy size={18} /> Copiar Diagnóstico
            </button>
            
            <button 
              onClick={this.resetApp}
              className="mt-4 text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Trash2 size={12} /> Limpar Cache e Sair
            </button>
          </div>
        </div>
      );
    }

    // Correctly accessing props inherited from React.Component.
    return this.props.children || null;
  }
}

export default ErrorBoundary;
