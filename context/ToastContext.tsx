
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { safeText } from '../utils/safeText';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  notifySuccess: (msg: any) => void;
  notifyError: (msg: any) => void;
  notifyInfo: (msg: any) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: any, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    // Garantimos que a mensagem armazenada seja sempre string
    setToasts((prev) => [...prev, { id, message: safeText(message), type }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const notifySuccess = (msg: any) => addToast(msg, 'success');
  const notifyError = (msg: any) => addToast(msg, 'error');
  const notifyInfo = (msg: any) => addToast(msg, 'info');

  return (
    <ToastContext.Provider value={{ notifySuccess, notifyError, notifyInfo }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-3 w-full max-w-xs px-4 pointer-events-none">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className={`
              pointer-events-auto flex items-center justify-between p-4 rounded-2xl shadow-2xl border-2 animate-in slide-in-from-top-4 duration-300
              ${t.type === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' : ''}
              ${t.type === 'error' ? 'bg-red-500 border-red-400 text-white' : ''}
              ${t.type === 'info' ? 'bg-blue-600 border-blue-500 text-white' : ''}
            `}
          >
            <div className="flex items-center gap-3">
              {t.type === 'success' && <CheckCircle size={18} />}
              {t.type === 'error' && <AlertCircle size={18} />}
              {t.type === 'info' && <Info size={18} />}
              <span className="text-[10px] font-black uppercase tracking-widest">{t.message}</span>
            </div>
            <button onClick={() => removeToast(t.id)} className="p-1 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
