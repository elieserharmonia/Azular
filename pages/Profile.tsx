
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../App';
import { firebaseEnabled } from '../lib/firebase';
import { getAuthClient } from '../services/authClient';
import { saveUserProfile, wipeUserData } from '../services/db';
import { useToast } from '../context/ToastContext';
import { 
  LogOut, 
  User as UserIcon, 
  Shield, 
  Camera, 
  Loader2, 
  ImagePlus, 
  Sparkles, 
  Save,
  Mail,
  Phone,
  Calendar,
  MapPin,
  CheckCircle,
  Settings,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { adService } from '../services/adService';
import { Link } from 'react-router-dom';

const MARKETING_CONSENT_TEXT = "Aceito receber comunicações, promoções e felicitações do Azular.";

const Profile: React.FC = () => {
  const { user, userProfile, isPreview } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useToast();
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  // Wipe Data State
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  
  // Form State
  const [fullName, setFullName] = useState(userProfile?.fullName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [birthDate, setBirthDate] = useState(userProfile?.birthDate || '');
  const [address, setAddress] = useState(userProfile?.address?.logradouro || '');
  const [marketingOptIn, setMarketingOptIn] = useState(userProfile?.marketingOptIn || false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsStandalone(('standalone' in window.navigator && (window.navigator as any).standalone) || window.matchMedia('(display-mode: standalone)').matches);
    
    if (userProfile) {
      setFullName(userProfile.fullName || userProfile.displayName || '');
      setPhone(userProfile.phone || '');
      setBirthDate(userProfile.birthDate || '');
      setAddress(userProfile.address?.logradouro || '');
      setMarketingOptIn(userProfile.marketingOptIn || false);
    }
  }, [userProfile]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    
    try {
      const { serverTimestamp } = (await import('firebase/firestore')) as any;
      
      const payload: any = {
        fullName: fullName.trim(),
        displayName: fullName.trim().split(' ')[0], 
        phone: phone.trim(),
        birthDate,
        address: { logradouro: address.trim() },
        marketingOptIn,
        updatedAt: serverTimestamp()
      };

      if (marketingOptIn !== userProfile?.marketingOptIn) {
        payload.marketingOptInAt = serverTimestamp();
        payload.marketingOptInText = MARKETING_CONSENT_TEXT;
      }

      await saveUserProfile(user.uid, payload);
      notifySuccess("Perfil atualizado com sucesso!");
    } catch (err) {
      notifyError("Erro ao salvar perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleWipeData = async () => {
    if (!user || wipeConfirmText !== 'APAGAR') return;
    
    setIsWiping(true);
    try {
      const result = await wipeUserData(user.uid);
      notifySuccess(`Base limpa: ${result.deletedCount} itens removidos.`);
      setShowWipeModal(false);
      setWipeConfirmText('');
      // Recarrega para limpar estados da UI
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      notifyError("Erro ao processar limpeza de dados.");
    } finally {
      setIsWiping(false);
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
            await saveUserProfile(user.uid, { avatarUrl: compressedBase64 });
            notifySuccess("Foto atualizada!");
            setTimeout(() => window.location.reload(), 1000);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      notifyError("Erro ao processar imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  const isAdmin = user?.email === "apptanamaoprofissionais@gmail.com";

  return (
    <div className="space-y-10 max-w-2xl mx-auto pb-32">
      <div className="flex flex-col items-center text-center">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-32 h-32 bg-white rounded-[2.8rem] flex items-center justify-center border-4 border-white shadow-2xl overflow-hidden relative transition-transform hover:scale-105">
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            ) : userProfile?.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={40} className="text-blue-300" />
            )}
            <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="text-white" size={24} />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 p-2 bg-blue-600 text-white rounded-xl shadow-xl border-2 border-white">
            <ImagePlus size={16} />
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>

        <div className="mt-6">
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">
            Olá, {userProfile?.fullName || userProfile?.displayName || 'Usuário'}
          </h2>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-blue-50 space-y-6">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <UserIcon size={14} className="text-blue-600" /> Dados Pessoais
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">Nome Completo</label>
              <div className="relative">
                <input 
                  required
                  type="text" 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-blue-50/50 border-b-2 border-blue-100 p-4 rounded-2xl font-black text-sm outline-none focus:border-blue-600 transition-all"
                  placeholder="Seu nome completo"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">E-mail (Login)</label>
                <div className="flex items-center gap-3 p-4 bg-gray-50 border-b-2 border-gray-100 rounded-2xl text-gray-400 cursor-not-allowed">
                  <Mail size={16} />
                  <span className="text-sm font-bold">{user?.email}</span>
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">WhatsApp / Telefone</label>
                <div className="relative">
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-blue-50/50 border-b-2 border-blue-100 p-4 rounded-2xl font-black text-sm outline-none focus:border-blue-600 transition-all"
                    placeholder="(00) 00000-0000"
                  />
                  <Phone size={16} className="absolute right-4 top-4 text-blue-200" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">Nascimento</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full bg-blue-50/50 border-b-2 border-blue-100 p-4 rounded-2xl font-black text-sm outline-none focus:border-blue-600 transition-all"
                  />
                  <Calendar size={16} className="absolute right-4 top-4 text-blue-200 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">Endereço Principal</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full bg-blue-50/50 border-b-2 border-blue-100 p-4 rounded-2xl font-black text-sm outline-none focus:border-blue-600 transition-all"
                    placeholder="Rua, Número, Bairro, Cidade..."
                  />
                  <MapPin size={16} className="absolute right-4 top-4 text-blue-200" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl text-white">
          <div className="flex items-center gap-4 mb-4">
            <Shield size={24} />
            <h4 className="font-black uppercase tracking-tight">Privacidade e LGPD</h4>
          </div>
          
          <label className="flex items-start gap-4 cursor-pointer group">
            <div className="relative mt-1">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={marketingOptIn} 
                onChange={e => setMarketingOptIn(e.target.checked)} 
              />
              <div className="w-6 h-6 bg-white/20 border-2 border-white/40 rounded-lg peer-checked:bg-white peer-checked:border-white transition-all flex items-center justify-center">
                <CheckCircle size={14} className={`text-blue-600 transition-opacity ${marketingOptIn ? 'opacity-100' : 'opacity-0'}`} />
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase leading-relaxed text-blue-50">
              {MARKETING_CONSENT_TEXT}
            </span>
          </label>
        </div>

        <button 
          disabled={isSaving}
          type="submit"
          className="w-full py-6 bg-gray-900 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          {isSaving ? 'Salvando...' : 'Atualizar Perfil'}
        </button>
      </form>

      {/* DANGER ZONE - WIPE DATA */}
      <section className="bg-red-50 p-8 rounded-[2.5rem] border-2 border-red-100 space-y-4">
        <div className="flex items-center gap-4 text-red-600">
           <AlertTriangle size={24} />
           <h4 className="font-black uppercase tracking-tight">Zona de Perigo</h4>
        </div>
        <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest">
           Limpe todos os seus lançamentos, contas, previsões e metas para começar do zero. Esta ação é irreversível.
        </p>
        <button 
          onClick={() => setShowWipeModal(true)}
          className="w-full py-4 bg-white border-2 border-red-200 text-red-500 font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
        >
          <Trash2 size={16} /> Limpar Meus Dados (Teste)
        </button>
      </section>

      {isAdmin && (
        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4">Administração</h3>
          <Link 
            to="/admin/usuarios"
            className="block p-8 bg-amber-50 border-2 border-amber-100 rounded-[2.5rem] hover:bg-amber-100 transition-colors group"
          >
            <div className="flex items-center gap-4 mb-2 text-amber-600">
              <Settings size={24} />
              <h4 className="text-lg font-black uppercase tracking-tight">Exportação de Leads</h4>
            </div>
            <p className="text-[10px] font-bold uppercase text-amber-700">Acesso restrito ao e-mail administrador. Visualize usuários que optaram por receber comunicações.</p>
          </Link>
        </div>
      )}

      <div className="pt-4">
        <button 
          onClick={handleLogout}
          className="w-full py-6 bg-white border-2 border-red-100 text-red-600 font-black uppercase tracking-widest rounded-[2rem] shadow-sm hover:bg-red-50 flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          <LogOut size={24} /> Sair do Aplicativo
        </button>
      </div>

      {/* MODAL DE WIPE DATA */}
      {showWipeModal && (
        <div className="fixed inset-0 bg-red-900/40 backdrop-blur-md z-[300] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-10 space-y-8 relative border-4 border-red-50">
            <div className="text-center space-y-4">
               <div className="w-16 h-16 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto">
                 <AlertTriangle size={32} />
               </div>
               <h3 className="text-2xl font-black uppercase tracking-tighter text-gray-900">Atenção Total</h3>
               <p className="text-sm font-bold text-gray-400 leading-tight">
                 Isso apaga TODOS os seus lançamentos, previsões, contas, categorias, dívidas e metas. Não tem volta.
               </p>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] font-black uppercase text-gray-400 block text-center tracking-widest">Digite <span className="text-red-500">APAGAR</span> para confirmar:</label>
               <input 
                 autoFocus
                 type="text" 
                 className="w-full bg-red-50 border-b-4 border-red-100 p-4 rounded-2xl font-black text-center text-red-600 outline-none focus:border-red-600 transition-all uppercase"
                 placeholder="Digite aqui..."
                 value={wipeConfirmText}
                 onChange={e => setWipeConfirmText(e.target.value)}
               />
            </div>

            <div className="flex flex-col gap-3">
              <button 
                disabled={wipeConfirmText !== 'APAGAR' || isWiping}
                onClick={handleWipeData}
                className="w-full bg-red-600 text-white py-6 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
              >
                {isWiping ? <Loader2 className="animate-spin" /> : <Trash2 size={20} />}
                {isWiping ? 'Limpando...' : 'Confirmar Exclusão'}
              </button>
              <button 
                onClick={() => { setShowWipeModal(false); setWipeConfirmText(''); }}
                className="w-full py-4 text-gray-300 font-black uppercase text-[10px] tracking-widest"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
