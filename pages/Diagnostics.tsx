
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Globe, AlertCircle, Copy, Trash2 } from 'lucide-react';
import { safeText } from '../utils/safeText';

const Diagnostics: React.FC = () => {
  const navigate = useNavigate();
  const [errorData, setErrorData] = useState<any>(null);

  useEffect(() => {
    const lastError = localStorage.getItem('azular_last_error');
    if (lastError) {
      try {
        setErrorData(JSON.parse(lastError));
      } catch (e) {
        setErrorData({ message: "Erro ao parsear log: " + lastError });
      }
    }
  }, []);

  const copyAll = () => {
    const report = {
      appVersion: "1.0.0",
      userAgent: navigator.userAgent,
      location: window.location.href,
      protocol: window.location.protocol,
      storage: { ...localStorage },
      lastError: errorData
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    alert("Relatório completo copiado para o clipboard!");
  };

  const clearLogs = () => {
    localStorage.removeItem('azular_last_error');
    setErrorData(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] p-6 space-y-8">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl shadow-sm text-gray-600">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black uppercase tracking-tighter">Diagnóstico Azular</h2>
      </header>

      <div className="grid gap-6">
        {/* Hardware & Env */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-blue-50 space-y-4">
          <div className="flex items-center gap-3 text-blue-600">
            <Globe size={20} />
            <h3 className="font-black uppercase text-xs">Ambiente Web</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-gray-400">Protocolo</span>
              <span className="text-blue-600">{safeText(window.location.protocol)}</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-gray-400">Path Base</span>
              <span className="text-blue-600">{safeText(window.location.pathname)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-gray-400">User Agent</span>
              <span className="text-[9px] font-mono text-gray-600 break-all bg-gray-50 p-2 rounded-lg">{safeText(navigator.userAgent)}</span>
            </div>
          </div>
        </div>

        {/* Last Error */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-red-50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle size={20} />
              <h3 className="font-black uppercase text-xs">Último Erro Registrado</h3>
            </div>
            {errorData && (
              <button onClick={clearLogs} className="text-red-400 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            )}
          </div>
          
          {errorData ? (
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-2xl">
                <p className="text-xs font-black text-red-700 uppercase mb-2">Mensagem</p>
                <p className="text-[11px] font-bold text-red-600 leading-tight">{safeText(errorData.message)}</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-2xl overflow-hidden">
                <p className="text-[8px] font-black text-gray-500 uppercase mb-2">Stack Trace</p>
                <pre className="text-[9px] font-mono text-red-400 overflow-x-auto">
                  {safeText(errorData.stack)}
                </pre>
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Registrado em: {safeText(new Date(errorData.time).toLocaleString())}</p>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">
              Nenhum erro detectado no momento.
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={copyAll}
        className="w-full bg-gray-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
      >
        <Copy size={20} /> Copiar Relatório Técnico
      </button>

      <div className="text-center">
        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Versão 1.0.0 Build-Capacitor</p>
      </div>
    </div>
  );
};

export default Diagnostics;
