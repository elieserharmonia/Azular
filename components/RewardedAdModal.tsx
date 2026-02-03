
import React, { useState, useEffect } from 'react';
import { X, Play, Heart, ShieldCheck, Timer } from 'lucide-react';

interface RewardedAdModalProps {
  onComplete: () => void;
  onCancel: () => void;
  benefitName: string;
}

const RewardedAdModal: React.FC<RewardedAdModalProps> = ({ onComplete, onCancel, benefitName }) => {
  const [stage, setStage] = useState<'prompt' | 'watching' | 'done'>('prompt');
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    let timer: any;
    if (stage === 'watching' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (stage === 'watching' && timeLeft === 0) {
      setStage('done');
    }
    return () => clearInterval(timer);
  }, [stage, timeLeft]);

  const startAd = () => setStage('watching');

  return (
    <div className="fixed inset-0 bg-blue-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in">
      <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-10 overflow-hidden relative">
        
        {stage === 'prompt' && (
          <div className="space-y-8 text-center animate-in zoom-in">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto">
              <Heart size={40} className="fill-current" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Apoie o Azular</h3>
              <p className="text-sm font-bold text-gray-400 leading-relaxed">
                Ao assistir um anúncio curto (15s), você ajuda a manter o projeto gratuito e libera:
              </p>
              <div className="mt-4 bg-blue-50 py-3 rounded-2xl font-black uppercase text-[10px] text-blue-600 tracking-widest">
                {benefitName} por 24 horas
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={startAd}
                className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
              >
                <Play size={20} /> Assistir e Liberar
              </button>
              <button 
                onClick={onCancel}
                className="w-full py-4 text-gray-300 font-black uppercase text-[10px] tracking-widest"
              >
                Agora não
              </button>
            </div>
          </div>
        )}

        {stage === 'watching' && (
          <div className="space-y-8 text-center animate-in fade-in">
             <div className="bg-gray-900 aspect-video rounded-[2rem] flex items-center justify-center relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2">
                  <Timer size={12} /> {timeLeft}s
                </div>
                <div className="text-white/20 font-black uppercase text-4xl">ANÚNCIO</div>
             </div>
             <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest animate-pulse">
               Agradecemos seu apoio ao Azular...
             </p>
          </div>
        )}

        {stage === 'done' && (
          <div className="space-y-8 text-center animate-in bounce-in">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto">
              <ShieldCheck size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 text-emerald-600">Obrigado!</h3>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Benefício liberado com sucesso.</p>
            </div>
            <button 
              onClick={onComplete}
              className="w-full bg-emerald-600 text-white py-6 rounded-2xl font-black uppercase tracking-widest shadow-xl"
            >
              Continuar
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default RewardedAdModal;
