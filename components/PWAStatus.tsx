
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudUpload, CheckCircle2 } from 'lucide-react';

const PWAStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showStatus && isOnline) return null;

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform ${showStatus ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
      <div className={`flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl border backdrop-blur-md ${
        isOnline 
          ? 'bg-emerald-500/90 text-white border-emerald-400' 
          : 'bg-amber-500/90 text-white border-amber-400'
      }`}>
        {isOnline ? (
          <>
            <CheckCircle2 size={16} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Azular Online & Sincronizado</span>
          </>
        ) : (
          <>
            <WifiOff size={16} className="animate-bounce" />
            <span className="text-[10px] font-black uppercase tracking-widest">Modo Offline — Salvo Localmente</span>
          </>
        )}
      </div>
    </div>
  );
};

export default PWAStatus;
