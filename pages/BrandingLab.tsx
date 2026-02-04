
import React from 'react';
import { Palette, Home, Layout as LayoutIcon, Sparkles } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

const BrandingLab: React.FC = () => {
  return (
    <div className="space-y-10 pb-20">
      <header>
        <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">Laboratório Criativo</h2>
        <p className="text-blue-500 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
          <Palette size={14} /> Explore a Identidade Azular
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-50 shadow-sm">
            <h3 className="font-black uppercase text-xs text-gray-400 mb-6 tracking-widest">Logo Original</h3>
            <div className="flex flex-col items-center gap-8 py-10 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
              <BrandLogo size={120} />
              <div className="text-center">
                <p className="text-sm font-bold text-gray-600">Conceito A-Shelter</p>
                <p className="text-[10px] text-gray-400 uppercase font-black">Design Humanista • Escalonável</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col items-center text-center justify-center py-12">
            <Sparkles size={48} className="mb-4 opacity-40" />
            <h3 className="font-black uppercase text-sm mb-2 tracking-widest">IA do Design</h3>
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest max-w-[200px]">
              O gerador de variações está sendo movido para um ambiente seguro.
            </p>
            <div className="mt-6 bg-white/10 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">Manutenção Criativa</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border-2 border-blue-50 shadow-sm flex flex-col min-h-[500px]">
          <h3 className="font-black uppercase text-xs text-gray-400 mb-6 tracking-widest">Paleta Azular</h3>
          <div className="flex-1 space-y-4">
            <div className="bg-[#2563EB] h-24 rounded-2xl flex items-end p-4 text-white font-black uppercase text-xs">Azul Azular (#2563EB)</div>
            <div className="bg-[#60A5FA] h-20 rounded-2xl flex items-end p-4 text-white font-black uppercase text-xs">Céu Azular (#60A5FA)</div>
            <div className="bg-[#F0F7FF] h-16 rounded-2xl flex items-end p-4 text-blue-600 font-black uppercase text-xs">Nuvem Azular (#F0F7FF)</div>
            
            <div className="pt-8 border-t border-gray-50 text-center">
               <LayoutIcon size={48} className="mx-auto text-gray-100 mb-4" />
               <p className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Visual Showroom — 100% Client Side Stable</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingLab;
