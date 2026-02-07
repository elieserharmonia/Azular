
import React, { useState, useEffect } from 'react';
import { getCategories, createCategory } from '../services/db';
import { Category } from '../types';
import { Plus, X, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface CategorySelectProps {
  userId: string;
  value: string;
  onChange: (id: string) => void;
  direction: 'credit' | 'debit' | 'both';
  error?: string;
}

const CategorySelect: React.FC<CategorySelectProps> = ({ userId, value, onChange, direction, error }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDirection, setNewCatDirection] = useState<'credit' | 'debit' | 'both'>(direction);
  const [isSaving, setIsSaving] = useState(false);
  const { notifySuccess, notifyError } = useToast();

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getCategories(userId);
      // Filtra categorias compatíveis com a direção do lançamento
      const filtered = data.filter(c => 
        direction === 'both' || c.direction === 'both' || c.direction === direction
      );
      setCategories(filtered);
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Sempre que o contexto do lançamento mudar, reseta a direção da nova categoria
    setNewCatDirection(direction === 'both' ? 'debit' : direction);
  }, [userId, direction]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Impede que o submit borbulhe para modais pai
    
    if (!newCatName.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const newId = await createCategory(userId, newCatName.trim(), newCatDirection);
      notifySuccess("Categoria criada!");
      await load(); 
      onChange(newId); 
      setShowModal(false);
      setNewCatName('');
    } catch (err) {
      notifyError("Erro ao criar categoria.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-gray-400 block tracking-widest">
        Categoria
      </label>
      
      <div className="relative">
        <select 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full font-black border-b-4 bg-transparent outline-none py-2 pr-10 transition-colors ${
            error ? 'border-red-400 text-red-600' : 'border-blue-50 focus:border-blue-600'
          }`}
        >
          <option value="">Escolha uma categoria</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        
        {loading && (
          <div className="absolute right-2 top-2">
            <Loader2 size={16} className="animate-spin text-blue-400" />
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        {error ? (
          <span className="text-[9px] font-bold uppercase text-red-500 animate-in fade-in slide-in-from-top-1">
            {error}
          </span>
        ) : <div />}
        
        <button 
          type="button"
          onClick={() => {
            setNewCatDirection(direction === 'both' ? 'debit' : direction);
            setShowModal(true);
          }}
          className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 flex items-center gap-1 tracking-tight"
        >
          <Plus size={14} /> Nova categoria
        </button>
      </div>

      {/* Modal Interno de Criação */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-blue-900/30 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
          onMouseDown={(e) => { if(e.target === e.currentTarget) setShowModal(false); }}
        >
          <div 
            className="bg-white rounded-[2.5rem] w-full max-w-xs shadow-2xl p-8 animate-in zoom-in duration-300 border-2 border-blue-50"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-black uppercase tracking-tight text-gray-900">Nova Categoria</h4>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">Nome</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full font-black border-b-2 border-gray-100 pb-2 outline-none focus:border-blue-600 text-sm bg-transparent"
                  placeholder="Ex: Assinaturas"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 block mb-2">Tipo / Fluxo</label>
                <select
                  required
                  value={newCatDirection}
                  onChange={e => setNewCatDirection(e.target.value as any)}
                  className="w-full font-black border-b-2 border-gray-100 pb-2 outline-none focus:border-blue-600 text-sm bg-transparent"
                >
                  <option value="debit">Saída (Gasto)</option>
                  <option value="credit">Entrada (Ganho)</option>
                  <option value="both">Ambos (Flexível)</option>
                </select>
              </div>

              <button 
                type="submit"
                disabled={isSaving}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Criar Categoria'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelect;
