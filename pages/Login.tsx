
import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Fingerprint, Sparkles } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const navigate = useNavigate();

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
    try {
      await setPersistence(auth, trustDevice ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/app/dashboard');
    } catch (err: any) {
      setError('E-mail ou senha não conferem. Vamos tentar de novo?');
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    setLoading(true);
    try {
      if (window.confirm("Use sua digital ou reconhecimento facial para entrar no Azular.")) {
        const savedEmail = localStorage.getItem('bio_email');
        const savedPass = localStorage.getItem('bio_pass');
        
        if (savedEmail && savedPass) {
          await setPersistence(auth, browserLocalPersistence);
          await signInWithEmailAndPassword(auth, savedEmail, savedPass);
          navigate('/app/dashboard');
        } else {
          setError('Biometria expirada. Entre com sua senha uma vez para reativar.');
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError('A biometria falhou. Use sua senha desta vez.');
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
          <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Bem-vindo(a) de volta</h2>
          <p className="text-gray-400 font-bold text-sm mb-10 uppercase tracking-widest">Acesse sua jornada Azular</p>

          {error && (
            <div className="bg-red-50 text-red-600 p-5 rounded-3xl text-sm mb-8 font-bold border-2 border-red-100 animate-in fade-in zoom-in duration-300">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-[0.2em]">Seu E-mail</label>
              <input 
                required
                type="email" 
                className="w-full border-b-4 border-blue-50 py-4 text-lg font-black outline-none focus:border-blue-600 transition-all placeholder:text-gray-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-[0.2em]">Sua Senha</label>
              <div className="relative">
                <input 
                  required
                  type={showPassword ? "text" : "password"} 
                  className="w-full border-b-4 border-blue-50 py-4 pr-10 text-lg font-black outline-none focus:border-blue-600 transition-all placeholder:text-gray-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors p-3"
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={trustDevice} 
                  onChange={(e) => setTrustDevice(e.target.checked)} 
                />
                <div className="w-11 h-6 bg-gray-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Confiar neste dispositivo</span>
            </div>

            <div className="flex flex-col gap-4 pt-4">
              <button 
                disabled={loading}
                type="submit" 
                className="w-full bg-blue-600 text-white font-black py-6 rounded-[2.5rem] shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm"
              >
                {loading ? 'Acessando Lar...' : 'Entrar no Azular'}
              </button>

              {biometricAvailable && (
                <button 
                  type="button"
                  onClick={handleBiometricLogin}
                  className="w-full bg-white border-2 border-blue-600 text-blue-600 font-black py-6 rounded-[2.5rem] shadow-sm hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                >
                  <Fingerprint size={24} /> Usar Biometria
                </button>
              )}
            </div>
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
