
import React, { useState, useEffect } from 'react';
import { getAuthClient } from '../services/authClient';
import { useAuth } from '../App';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Fingerprint, Sparkles, AlertCircle } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

/**
 * ⚠️ IMPORTANTE: Auth é lazy por causa do Google AI Studio preview.
 * Não mover getAuth ou signInWithEmailAndPassword para imports de topo.
 */

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const navigate = useNavigate();
  const { isPreview } = useAuth();

  useEffect(() => {
    if (window.PublicKeyCredential) {
      const hasBio = localStorage.getItem('biometric_enabled') === 'true';
      setBiometricAvailable(hasBio);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isPreview) {
      setTimeout(() => navigate('/app/dashboard'), 500);
      return;
    }

    try {
      const auth = await getAuthClient();
      const { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } = await import('firebase/auth');
      
      await setPersistence(auth, trustDevice ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/app/dashboard');
    } catch (err: any) {
      if (err.message === "AUTH_DISABLED_IN_PREVIEW") {
        setError("Modo preview: login desativado. Use a versão Vercel.");
      } else {
        setError('E-mail ou senha não conferem.');
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
          {isPreview && (
            <div className="mb-8 p-4 bg-amber-50 border-2 border-amber-100 rounded-3xl flex items-start gap-3">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-[10px] font-black uppercase text-amber-800 tracking-widest">Ambiente de Preview</p>
                <p className="text-[11px] font-bold text-amber-600 leading-tight mt-1">
                  Firebase Auth desativado nesta sandbox. Clique em entrar para testar.
                </p>
              </div>
            </div>
          )}

          <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Bem-vindo(a)</h2>
          <p className="text-gray-400 font-bold text-sm mb-10 uppercase tracking-widest">Acesse sua jornada Azular</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-5 rounded-3xl text-sm mb-8 font-bold border-2 border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">E-mail</label>
              <input 
                required
                type="email" 
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
                  className="w-full border-b-4 border-blue-50 py-4 text-lg font-black outline-none focus:border-blue-600 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              disabled={loading}
              type="submit" 
              className="w-full bg-blue-600 text-white font-black py-6 rounded-[2.5rem] shadow-xl uppercase tracking-widest text-sm"
            >
              {loading ? 'Acessando...' : 'Entrar no Azular'}
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
