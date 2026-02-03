
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { getCategories } from '../services/db';
import { Category } from '../types';
import { Plus, Trash2, Tags, X } from 'lucide-react';
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const CategoriesPage: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    direction: 'debit' as 'credit' | 'debit' | 'both'
  });

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    try {
      const cats = await getCategories(user!.uid);
      setCategories(cats);
    } catch (err) {
      console.error("Load categories error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;
    
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'categories'), {
        ...formData,
        userId: user!.uid,
        createdAt: serverTimestamp()
      });
      
      setFormData({ name: '', direction: 'debit' });
      setShowModal(false);
      load();
    } catch (err: any) {
      console.error("createCategory error:", err);
      if (err.code === 'permission-denied') {
        alert("Sem permissão para salvar. Verifique login e regras do Firestore.");
      } else {
        alert("Erro ao salvar categoria: " + err.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja excluir esta categoria?")) {
      try {
        await deleteDoc(doc(db, 'categories', id));
        load();
      } catch (err) {
        alert("Erro ao excluir. Verifique permissões.");
      }
    }
  };

  if (loading) return <div className="p-8 text-center font-black uppercase text-indigo-600 animate-pulse">Carregando categorias...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900 leading-none">Categorias</h2>
          <p className="text-gray-500 font-bold uppercase text-xs tracking-widest mt-1">Organize seus ganhos e gastos</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white p-4 rounded-2xl flex items-center gap-2 hover:scale-105 transition shadow-lg"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-gray-50 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${cat.direction === 'credit' ? 'bg-emerald-50 text-emerald-600' : cat.direction === 'debit' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                <Tags size={20} />
              </div>
              <div>
                <h3 className="font-black text-gray-800 uppercase text-sm leading-tight">{cat.name}</h3>
                <span className="text-[10px] uppercase font-black text-gray-300 tracking-widest">
                  {cat.direction === 'credit' ? 'Crédito' : cat.direction === 'debit' ? 'Débito' : 'Ambos'}
                </span>
              </div>
            </div>
            <button 
              onClick={() => handleDelete(cat.id!)}
              className="p-3 text-gray-200 hover:text-red-500 transition-colors"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
        {categories.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-gray-300 font-black uppercase">Nenhuma categoria encontrada</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Cadastrar Categoria</h3>
              <button onClick={() => setShowModal(false)}><X size={32} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Nome da Categoria</label>
                <input 
                  required 
                  autoFocus
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full border-b-4 border-gray-100 py-3 text-xl font-black outline-none focus:border-indigo-500 transition-colors" 
                  placeholder="Ex: Lazer, Freelance..." 
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Tipo de Fluxo</label>
                <select 
                  value={formData.direction} 
                  onChange={e => setFormData({...formData, direction: e.target.value as any})} 
                  className="w-full border-b-4 border-gray-100 py-3 font-black text-lg outline-none focus:border-indigo-500 bg-transparent"
                >
                  <option value="debit">Débito (Saída)</option>
                  <option value="credit">Crédito (Entrada)</option>
                  <option value="both">Ambos (Flexível)</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={isSaving}
                className={`w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${isSaving ? 'opacity-50 cursor-wait' : 'hover:bg-indigo-700'}`}
              >
                {isSaving ? 'Salvando...' : 'Salvar Categoria'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
