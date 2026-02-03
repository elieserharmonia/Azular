
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Download, RefreshCw, Palette, Home, Layout as LayoutIcon } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

const BrandingLab: React.FC = () => {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [promptStyle, setPromptStyle] = useState('minimalist 3d glassmorphism');

  const generateLogoArt = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: `A professional high-quality app icon for a home finance app named 'Azular'. Style: ${promptStyle}. The icon should feature a minimalist house shape combined with a stylized letter A, using ocean blue and sky blue gradients. Clean white background, center composition, 4k resolution, welcoming and trustworthy vibe.` }
          ]
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (err) {
      console.error("Erro ao gerar arte:", err);
      alert("Ocorreu um erro na geração da imagem. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const styles = [
    { id: 'minimalist 3d glassmorphism', label: 'Moderno 3D' },
    { id: 'flat vector illustration', label: 'Ilustração Flat' },
    { id: 'bauhaus geometric abstract', label: 'Geométrico' },
    { id: 'soft claymorphism amigável', label: 'Amigável/Clay' },
  ];

  return (
    <div className="space-y-10 pb-20">
      <header>
        <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">Laboratório Criativo</h2>
        <p className="text-blue-500 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
          <Palette size={14} /> Explore a Identidade Azular com IA
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

          <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl">
            <h3 className="font-black uppercase text-xs opacity-60 mb-6 tracking-widest">Gerador de Variações</h3>
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase">Escolha um estilo visual:</label>
              <div className="grid grid-cols-2 gap-3">
                {styles.map(s => (
                  <button 
                    key={s.id}
                    onClick={() => setPromptStyle(s.id)}
                    className={`p-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${promptStyle === s.id ? 'bg-white text-blue-600 border-white shadow-lg' : 'bg-blue-700/50 border-white/10 text-white hover:bg-blue-700'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button 
                onClick={generateLogoArt}
                disabled={loading}
                className="w-full mt-4 bg-white text-blue-600 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="animate-spin" /> : <Sparkles size={18} />}
                {loading ? 'Azulando sua Arte...' : 'Gerar Arte com IA'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border-2 border-blue-50 shadow-sm flex flex-col min-h-[500px]">
          <h3 className="font-black uppercase text-xs text-gray-400 mb-6 tracking-widest">Resultado da IA</h3>
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-[2rem] overflow-hidden relative group">
            {generatedImage ? (
              <>
                <img src={generatedImage} alt="AI Generated Logo" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a 
                    href={generatedImage} 
                    download="azular-brand-art.png"
                    className="bg-white text-blue-600 p-4 rounded-full shadow-2xl hover:scale-110 transition-all"
                  >
                    <Download size={24} />
                  </a>
                </div>
              </>
            ) : (
              <div className="text-center p-10">
                <LayoutIcon size={48} className="mx-auto text-gray-200 mb-4" />
                <p className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Aguardando comando criativo...</p>
              </div>
            )}
          </div>
          <p className="text-[9px] text-gray-400 font-bold uppercase mt-6 text-center italic">
            Esta funcionalidade utiliza o modelo Gemini 2.5 Flash Image para criar representações artísticas da nossa marca.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BrandingLab;
