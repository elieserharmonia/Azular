import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Globe, AlertCircle, Copy, Trash2, RefreshCw, Cpu } from 'lucide-react';
import { safeText } from '../utils/safeText';
import { BUILD_ID } from '../utils/env';

const Diagnostics: React.FC = () => {
  const navigate = useNavigate();
  const [errorData, setErrorData] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

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

  const forceUpdate = async () => {
    if (!confirm("Isso irá limpar o cache e reinstalar a versão mais recente. Continuar?")) return;
    setUpdating(true);
    try {
      // 1. Unregister SWs
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }
      // 2. Clear all Caches
      const cacheNames = await caches.keys();
      for (let name of cacheNames) {
        await caches.delete(name);
      }
      // 3. Reload bypassando cache do browser
      window.location.reload();
    } catch (err) {
      alert("Falha ao atualizar. Tente limpar os dados do navegador manualmente.");
      setUpdating(false);
    }
  };

  const copyAll = () => {
    const report = {
      appVersion: "1.0.0",
      buildId: BUILD_ID,
      userAgent: navigator.userAgent,
      location: window.location.href,
      protocol: window.location.protocol,
      storage: { ...localStorage },
      lastError: errorData
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    alert("Relatório completo copiado!");
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
        {/* Info Build */}
        <div className="bg-blue-600 text-white p-6 rounded-[2rem] shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <Cpu size={20} />
            <h3 className="font-black uppercase text-xs tracking-widest">Informações da Build</h3>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold opacity-60 uppercase">Build ID</p>
              <p className="text-xl font-black font-mono">{BUILD_ID}</p>
            </div>
            <button 
              disabled={updating}
              onClick={forceUpdate}
              className="bg-white/20 p-4 rounded-2xl hover:bg-white/30 transition-all flex items-center gap-2 font-black uppercase text-[10px]"
            >
              <RefreshCw size={16} className={updating ? "animate-spin" : ""} />
              {updating ? "Atualizando..." : "Atualizar App"}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-blue-50 space-y-4">
          <div className="flex items-center gap-3 text-blue-600">
            <Globe size={20} />
            <h3 className="font-black uppercase text-xs">Ambiente Web</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-gray-400">PWA Mode</span>
              <span className="text-blue-600 font-black">
                {window.matchMedia('(display-mode: standalone)').matches ? "STANDALONE" : "BROWSER"}
              </span>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-gray-400">Versão Core</span>
              <span className="text-blue-600">1.0.0-stable</span>
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
              <button onClick={() => { localStorage.removeItem('azular_last_error'); setErrorData(null); }} className="text-red-400 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            )}
          </div>
          
          {errorData ? (
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-2xl">
                <p className="text-[11px] font-bold text-red-600 leading-tight">{safeText(errorData.message)}</p>
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Registrado em: {safeText(new Date(errorData.time).toLocaleString())}</p>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">
              Nenhum erro detectado.
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
    </div>
  );
};

export default Diagnostics;