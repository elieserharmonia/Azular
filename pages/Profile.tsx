
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../App';
import { firebaseEnabled } from '../lib/firebase';
import { getDb } from '../services/firestoreClient';
import { getAuthClient } from '../services/authClient';
import { 
  LogOut, 
  User as UserIcon, 
  Shield, 
  Camera, 
  Loader2, 
  ImagePlus, 
  Fingerprint, 
  Sparkles, 
  Download,
  Smartphone,
  Share,
  PlusSquare
} from 'lucide-react';
import { adService } from '../services/adService';

const Profile: React.FC = () => {
  const { user, userProfile, isPreview } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [supportWebAuthn, setSupportWebAuthn] = useState(false);
  const [isPremium, setIsPremium] = useState(adService.isPremium());
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSupportWebAuthn(!!window.PublicKeyCredential);
    setBiometricEnabled(localStorage.getItem('biometric_enabled') === 'true');
    
    // Detectar iOS e PWA mode
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsStandalone(('standalone' in window.navigator && (window.navigator as any).standalone) || window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  const handleLogout = async () => {
    if (window.confirm("Deseja sair do aplicativo?")) {
      try {
        if (isPreview || !firebaseEnabled) {
          window.location.reload();
          return;
        }
        const authClient = await getAuthClient();
        const { signOut } = await import('firebase/auth');
        await signOut(authClient);
      } catch (err) {
        console.error("Logout error:", err);
      }
    }
  };

  const togglePremium = () => {
    const next = !isPremium;
    adService.setPremium(next);
    setIsPremium(next);
  };

  const toggleBiometry = async () => {
    if (!biometricEnabled) {
      const confirmBio = window.confirm("Ao ativar a biometria, você poderá entrar no app usando sua digital ou reconhecimento facial.");
      if (confirmBio) {
        const password = window.prompt("Para confirmar, digite sua senha atual:");
        if (password && user?.email) {
          localStorage.setItem('biometric_enabled', 'true');
          localStorage.setItem('bio_email', user.email);
          localStorage.setItem('bio_pass', password);
          setBiometricEnabled(true);
        }
      }
    } else {
      localStorage.removeItem('biometric_enabled');
      localStorage.removeItem('bio_email');
      localStorage.removeItem('bio_pass');
      setBiometricEnabled(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 256;
          canvas.width = MAX_SIZE;
          canvas.height = MAX_SIZE;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, MAX_SIZE, MAX_SIZE);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            if (firebaseEnabled) {
              const db = await getDb();
              const { doc, updateDoc } = await import('firebase/firestore');
              await updateDoc(doc(db, 'users', user.uid), { avatarUrl: compressedBase64 });
            }
            window.location.reload();
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert("Erro ao processar imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-2xl mx-auto pb-20">
      <div className="flex flex-col items-center text-center">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-36 h-36 bg-white rounded-[2.8rem] flex items-center justify-center border-4 border-white shadow-2xl overflow-hidden relative">
            {isUploading ? (
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            ) : userProfile?.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={48} className="text-blue-300" />
            )}
            <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="text-white" size={32} />
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 p-3 bg-blue-600 text-white rounded-2xl shadow-xl border-4 border-white">
            <ImagePlus size={20} />
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>

        <div className="mt-8">
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none">
            {userProfile?.displayName || 'Usuário'}
          </h2>
          <p className="text-gray-400 font-bold text-sm tracking-widest mt-1">{user?.email}</p>
        </div>
      </div>

      {/* Instalação PWA */}
      {!isStandalone && (
        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4">App no Celular</h3>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-blue-50">
            <div className="flex items-center gap-4 mb-4 text-blue-600">
              <Smartphone size={24} />
              <h4 className="text-lg font-black uppercase tracking-tight">Azular na Tela Inicial</h4>
            </div>
            
            {isIOS ? (
              <div className="space-y-4">
                <p className="text-xs font-bold text-gray-500 uppercase leading-relaxed">No iPhone/iPad, siga estes passos para instalar:</p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Share size={18} className="text-blue-600" />
                    <span className="text-[10px] font-black uppercase tracking-tight">1. Toque em 'Compartilhar'</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <PlusSquare size={18} className="text-blue-600" />
                    <span className="text-[10px] font-black uppercase tracking-tight">2. Selecione 'Adicionar à Tela de Início'</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-bold text-gray-500 uppercase leading-relaxed">Para uma experiência melhor e acesso offline, instale o Azular no seu Android ou PC.</p>
                <button 
                  id="pwa-install-btn"
                  className="w-full py-4 bg-blue-50 text-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-blue-100 transition-all"
                >
                  <Download size={18} /> Instalar Agora
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4">Apoio ao Projeto</h3>
        <div 
          onClick={togglePremium}
          className={`p-8 rounded-[2.5rem] shadow-xl border-2 transition-all cursor-pointer group active:scale-[0.98] ${isPremium ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white border-blue-50 text-gray-900'}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-4 rounded-2xl ${isPremium ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
              <Sparkles size={24} />
            </div>
            {isPremium && (
              <div className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Premium Ativo</div>
            )}
          </div>
          <h4 className="text-xl font-black uppercase tracking-tighter mb-2">
            {isPremium ? 'Assinante Azular' : 'Remover Anúncios'}
          </h4>
          <p className={`text-[10px] font-bold uppercase tracking-widest leading-relaxed ${isPremium ? 'text-blue-100' : 'text-gray-400'}`}>
            {isPremium 
              ? 'Obrigado por apoiar o desenvolvimento do Azular 💙.' 
              : 'Remova os banners e libere PDFs e Insights sem precisar assistir anúncios.'}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4">Segurança e Acesso</h3>
        <div className="bg-white rounded-[2rem] shadow-sm border-2 border-blue-50 overflow-hidden">
          {supportWebAuthn && (
            <div className="p-6 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Fingerprint size={20} /></div>
                <div>
                  <span className="font-black uppercase text-xs block text-gray-700">Acesso Biométrico</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Entrar sem digitar senha</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={biometricEnabled} onChange={toggleBiometry} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          )}
          <div className="p-6 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer text-gray-700">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Shield size={20} /></div>
            <span className="font-black uppercase text-xs">Dispositivo Autorizado</span>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <button 
          onClick={handleLogout}
          className="w-full py-6 bg-white border-2 border-red-100 text-red-600 font-black uppercase tracking-widest rounded-[2rem] shadow-sm hover:bg-red-50 flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          <LogOut size={24} /> Sair do Aplicativo
        </button>
      </div>
    </div>
  );
};

export default Profile;
