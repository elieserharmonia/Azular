
import React, { useState, useEffect } from 'react';
import { getAuthClient } from '../services/authClient';
import { useAuth } from '../App';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { useToast } from '../context/ToastContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isPreview: isPreviewMode } = useAuth();
  const { notifyError, notifyInfo } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    console.log("[Auth] signIn start");

    if (isPreviewMode) {
      console.log("[Auth] Bypass login for preview");
      setTimeout(() => navigate('/app/dashboard'), 500);
      return;
    }

    // Timeout de diagnóstico para onAuthStateChanged
    const authTimeout = setTimeout(() => {
      if (loading) {
        console.warn("[Auth] Login taking too long. Possible state hang.");
        notifyInfo("Sessão demorando para iniciar. Verifique cookies do navegador.");
      }
    }, 5000);

    try {
      const auth = await getAuthClient();
      const { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } = await import('firebase/auth');
      
      await setPersistence(auth, trustDevice ? browserLocalPersistence : browserSessionPersistence);
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      
      console.log("[Auth] signIn success uid =", userCred.user.uid);
      clearTimeout(authTimeout);
      
      // Navegação imediata após sucesso
      navigate('/app/dashboard');
    } catch (err: any) {
      clearTimeout(authTimeout);
      console.error("[Auth] Login failed:", err.code, err.message);
      
      if (err.message === "AUTH_DISABLED_IN_PREVIEW") {
        setError("Ambiente de preview: use a versão oficial para login Firebase.");
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha inválidos.');
      } else {
        setError('Não foi possível entrar. Tente novamente mais tarde.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col md:flex-row">
      <div className="md:w-1/2 bg-blue-600 p-12 flex flex-col justify-center text-white relative overflow-hidden">
        <div className="absolute top-[-100px] right-[-100px] w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-100px] left-[-50px] w-80 h-80 bg-blue-700/40 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 max-w-sm mx-auto md:mx-0">
          <BrandLogo size={64} light variant="full" className="mb-10" />
          <p className="text-2xl font-bold mb-4 opacity-90 leading-tight">Cuidar do dinheiro começa em casa.</p>
          <p className="text-blue-100 font-medium leading-relaxed mb-8">
            Um guia humano e calmo para organizar suas finanças, realizar seus sonhos e proteger quem você ama.
          </p>
          <div className="flex items-center gap-2 text-blue-200 text-[10px] font-black uppercase tracking-widest">
            <Sparkles size={16} /> Sem julgamentos, apenas clareza.
          </div>
        </div>
      </div>

      <div className="md:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full">
          {isPreviewMode && (
            <div className="mb-8 p-4 bg-amber-50 border-2 border-amber-100 rounded-3xl flex items-start gap-3">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-[10px] font-black uppercase text-amber-800 tracking-widest">Modo Preview Ativo</p>
                <p className="text-[11px] font-bold text-amber-600 leading-tight mt-1">
                  Clique em entrar para testar as funcionalidades sem necessidade de conta real.
                </p>
              </div>
            </div>
          )}

          <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Bem-vindo(a)</h2>
          <p className="text-gray-400 font-bold text-sm mb-10 uppercase tracking-widest">Acesse sua jornada Azular</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-5 rounded-3xl text-sm mb-8 font-bold border-2 border-red-100 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">E-mail</label>
              <input 
                required
                type="email" 
                autoComplete="email"
                className="w-full border-b-4 border-blue-50 py-4 text-lg font-black outline-none focus:border-blue-600 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Senha</label>
              <div className="relative">
                <input 
                  required
                  type={showPassword ? "text" : "password"} 
                  autoComplete="current-password"
                  className="w-full border-b-4 border-blue-50 py-4 text-lg font-black outline-none focus:border-blue-600 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              disabled={loading}
              type="submit" 
              className="w-full bg-blue-600 text-white font-black py-6 rounded-[2.5rem] shadow-xl uppercase tracking-widest text-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              {loading ? 'Entrando...' : 'Entrar no Azular'}
            </button>
          </form>
          
          <div className="mt-12 text-center text-sm font-bold text-gray-400 uppercase tracking-widest">
            Novo por aqui? <Link to="/signup" className="text-blue-600 hover:underline">Criar conta</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
