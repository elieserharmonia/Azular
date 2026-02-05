import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Globe, AlertCircle, Copy, Trash2, RefreshCw, Cpu, Activity } from 'lucide-react';
import { safeText } from '../utils/safeText';
import { BUILD_ID, isPreview } from '../utils/env';

const Diagnostics: React.FC = () => {
  const navigate = useNavigate();
  const [errorData, setErrorData] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const resources = (window as any).__AZULAR_RESOURCES || {};

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
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }
      const cacheNames = await caches.keys();
      for (let name of cacheNames) {
        await caches.delete(name);
      }
      window.location.reload();
    } catch (err) {
      alert("Falha ao atualizar.");
      setUpdating(false);
    }
  };

  const copyAll = () => {
    const report = {
      appVersion: "1.1.0",
      buildId: BUILD_ID,
      isPreview: isPreview(),
      origin: window.location.origin,
      resources,
      userAgent: navigator.userAgent,
      lastError: errorData
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    alert("Relatório copiado!");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] p-6 space-y-8 pb-32">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl shadow-sm text-gray-600">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black uppercase tracking-tighter">Status do Sistema</h2>
      </header>

      <div className="grid gap-6">
        {/* Info Build */}
        <div className="bg-blue-600 text-white p-6 rounded-[2rem] shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <Cpu size={20} />
            <h3 className="font-black uppercase text-xs tracking-widest">Core Information</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold opacity-60 uppercase">Build ID</p>
              <p className="text-lg font-black font-mono">{BUILD_ID}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold opacity-60 uppercase">Ambiente</p>
              <p className="text-lg font-black uppercase">{isPreview() ? "PREVIEW / DEMO" : "PRODUÇÃO"}</p>
            </div>
          </div>
        </div>

        {/* Recursos Dinâmicos */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-blue-50 space-y-4">
          <div className="flex items-center gap-3 text-blue-600">
            <Activity size={20} />
            <h3 className="font-black uppercase text-xs">Recursos Injetados</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-gray-400">PWA Manifest</span>
              <span className={resources.manifest ? "text-emerald-600" : "text-amber-500"}>
                {resources.manifest ? "ATIVO" : "IGNORADO (PREVIEW)"}
              </span>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-gray-400">Service Worker</span>
              <span className={resources.sw ? "text-emerald-600" : "text-amber-500"}>
                {resources.sw ? "REGISTRADO" : "NÃO CARREGADO"}
              </span>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span className="text-gray-400">Google Fonts</span>
              <span className={resources.fonts ? "text-emerald-600" : "text-amber-500"}>
                {resources.fonts ? "CARREGADO" : "NÃO CARREGADO"}
              </span>
            </div>
          </div>
        </div>

        {/* Ambiente Web */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-blue-50 space-y-4">
          <div className="flex items-center gap-3 text-blue-600">
            <Globe size={20} />
            <h3 className="font-black uppercase text-xs">Ambiente Web</h3>
          </div>
          <div className="space-y-1">
            <p className="text-[8px] font-bold text-gray-400 uppercase">Origin Atual</p>
            <p className="text-[10px] font-mono text-gray-600 break-all bg-gray-50 p-2 rounded-lg">{window.location.origin}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button 
          onClick={copyAll}
          className="w-full bg-gray-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
        >
          <Copy size={20} /> Copiar Relatório
        </button>
        
        <button 
          onClick={forceUpdate}
          className="w-full bg-white border-2 border-blue-100 text-blue-600 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} className={updating ? "animate-spin" : ""} />
          Forçar Reinstalação
        </button>
      </div>
    </div>
  );
};

export default Diagnostics;