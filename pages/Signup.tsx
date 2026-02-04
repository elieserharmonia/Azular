
import React, { useState } from 'react';
import { firebaseEnabled } from '../lib/firebase';
import { getAuthClient } from '../services/authClient';
import { getDb } from '../services/firestoreClient';
import { Link, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { DEFAULT_CATEGORIES } from '../constants';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { isAiStudioPreview } from '../utils/env';

/**
 * ⚠️ IMPORTANTE: Auth é lazy por causa do Google AI Studio preview.
 * Não mover createUserWithEmailAndPassword para imports de topo.
 */

const Signup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isPreview = isAiStudioPreview();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isPreview) {
      setError("Criação de conta desativada no modo preview.");
      setLoading(false);
      return;
    }

    try {
      const auth = await getAuthClient();
      // FIX: Obtain db instance asynchronously via getDb() to ensure compatibility with preview environments
      const db = await getDb();
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      
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
      console.error("Signup Error:", err);
      setError('Erro ao criar conta. Tente novamente mais tarde.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-600 flex flex-col justify-center p-6">
      <div className="max-w-md w-full mx-auto bg-white rounded-3xl shadow-2xl p-8">
        <h1 className="text-3xl font-black text-blue-600 mb-2 text-center uppercase tracking-tighter">Criar Conta</h1>
        <p className="text-gray-500 text-center mb-8 font-medium">Organize sua vida financeira</p>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-6 font-bold border-2 border-red-100">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Nome</label>
            <input required type="text" className="w-full border-b-4 border-gray-100 py-3 text-lg font-black outline-none focus:border-blue-500" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">E-mail</label>
            <input required type="email" className="w-full border-b-4 border-gray-100 py-3 text-lg font-black outline-none focus:border-blue-500" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Senha</label>
            <input required type={showPassword ? "text" : "password"} className="w-full border-b-4 border-gray-100 py-3 text-lg font-black outline-none focus:border-blue-500" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white font-black py-5 rounded-[2rem] shadow-xl uppercase tracking-widest">
            {loading ? 'Criando...' : 'Começar Agora'}
          </button>
        </form>
        
        <div className="mt-10 text-center text-sm font-bold text-gray-400 uppercase tracking-widest">
          Já tem conta? <Link to="/login" className="text-blue-600 hover:underline">Entrar</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
