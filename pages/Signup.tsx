
import React, { useState } from 'react';
// Fix: Use standard modular named import for createUserWithEmailAndPassword from firebase/auth
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { DEFAULT_CATEGORIES } from '../constants';
import { Eye, EyeOff } from 'lucide-react';

const Signup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Fix: Use modular account creation function correctly with the auth instance
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCred.user.uid;

      const catPromises = DEFAULT_CATEGORIES.map(cat => 
        addDoc(collection(db, 'categories'), {
          ...cat,
          userId,
          createdAt: serverTimestamp()
        })
      );
      
      const accPromise = addDoc(collection(db, 'accounts'), {
        userId,
        name: 'Carteira Principal',
        kind: 'individual',
        initialBalance: 0,
        active: true,
        createdAt: serverTimestamp()
      });

      await Promise.all([...catPromises, accPromise]);
      navigate('/app/dashboard');
    } catch (err: any) {
      setError('Erro ao criar conta. Verifique se o e-mail é válido e a senha tem 6+ caracteres.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col justify-center p-6">
      <div className="max-w-md w-full mx-auto bg-white rounded-3xl shadow-2xl p-8">
        <h1 className="text-3xl font-black text-indigo-600 mb-2 text-center uppercase tracking-tighter">Criar Conta</h1>
        <p className="text-gray-500 text-center mb-8 font-medium">Comece a organizar sua vida financeira</p>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-6 font-bold border-2 border-red-100 animate-pulse">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Nome Completo</label>
            <input 
              required
              type="text" 
              className="w-full border-b-4 border-gray-100 py-3 text-lg font-black outline-none focus:border-indigo-500 transition-colors"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como quer ser chamado?"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">E-mail</label>
            <input 
              required
              type="email" 
              className="w-full border-b-4 border-gray-100 py-3 text-lg font-black outline-none focus:border-indigo-500 transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Senha</label>
            <div className="relative">
              <input 
                required
                type={showPassword ? "text" : "password"} 
                className="w-full border-b-4 border-gray-100 py-3 pr-10 text-lg font-black outline-none focus:border-indigo-500 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-2"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button 
            disabled={loading}
            type="submit" 
            className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest"
          >
            {loading ? 'Criando Conta...' : 'Começar Agora'}
          </button>
        </form>
        
        <div className="mt-10 text-center text-sm font-bold text-gray-400 uppercase tracking-widest">
          Já tem conta? <Link to="/login" className="text-indigo-600 hover:underline">Entrar</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
