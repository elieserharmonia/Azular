
import React from 'react';
import { adService } from '../services/adService';

const BannerAd: React.FC = () => {
  if (adService.isPremium()) return null;

  return (
    <div className="w-full py-4 mt-8 animate-in fade-in duration-1000">
      <div className="max-w-md mx-auto">
        <p className="text-[8px] font-black uppercase text-gray-300 text-center mb-1 tracking-widest">
          Publicidade — ajuda a manter o Azular gratuito
        </p>
        <div className="bg-gray-100 border-2 border-gray-50 rounded-2xl h-[100px] flex items-center justify-center overflow-hidden">
          {/* Mock do AdSense / Espaço para Script de Anúncio */}
          <div className="text-[10px] font-bold text-gray-400 uppercase text-center px-6">
            Anúncio Discreto Azular<br/>
            <span className="opacity-50 font-medium">Os anúncios nunca interrompem sua organização financeira.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerAd;
