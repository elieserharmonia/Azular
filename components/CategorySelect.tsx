
import React, { useState, useEffect, useMemo } from 'react';
import { getCategories, getSubcategories, createCategory } from '../services/db';
import { Category, Subcategory } from '../types';
import { 
  Plus, X, Loader2, Search, ChevronRight, Tag, 
  ShoppingCart, Tv, BookOpen, HeartHandshake, BadgeDollarSign, 
  GraduationCap, School, Sparkles, Receipt, Pizza, 
  PartyPopper, Home, Utensils, Shield, Wallet, 
  HeartPulse, Plug, Car, MoreHorizontal
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { COLOR_MAP } from '../constants';

const IconMap: Record<string, React.ReactNode> = {
  'shopping-cart': <ShoppingCart size={18} />,
  'tv': <Tv size={18} />,
  'book-open': <BookOpen size={18} />,
  'heart-handshake': <HeartHandshake size={18} />,
  'badge-dollar-sign': <BadgeDollarSign size={18} />,
  'graduation-cap': <GraduationCap size={18} />,
  'school': <School size={18} />,
  'sparkles': <Sparkles size={18} />,
  'receipt': <Receipt size={18} />,
  'pizza': <Pizza size={18} />,
  'party-popper': <PartyPopper size={18} />,
  'home': <Home size={18} />,
  'utensils': <Utensils size={18} />,
  'shield': <Shield size={18} />,
  'wallet': <Wallet size={18} />,
  'heart-pulse': <HeartPulse size={18} />,
  'plug': <Plug size={18} />,
  'car': <Car size={18} />,
  'more-horizontal': <MoreHorizontal size={18} />,
  'tag': <Tag size={18} />
};

interface CategorySelectProps {
  userId: string;
  categoryId: string;
  subcategoryId?: string;
  onChange: (catId: string, subId?: string) => void;
  direction: 'credit' | 'debit' | 'both';
  error?: string;
}

const CategorySelect: React.FC<CategorySelectProps> = ({ 
  userId, categoryId, subcategoryId, onChange, direction, error 
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMainModal, setShowMainModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isCreating, setIsCreating] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const { notifySuccess, notifyError } = useToast();

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getCategories(userId);
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  // Carrega subcategorias quando a categoria muda
  useEffect(() => {
    if (categoryId) {
      getSubcategories(userId, categoryId).then(setSubcategories);
    } else {
      setSubcategories([]);
    }
  }, [categoryId, userId]);

  const filteredCategories = useMemo(() => {
    const dirFiltered = categories.filter(c => 
      direction === 'both' || c.direction === 'both' || c.direction === direction
    );
    
    if (!searchTerm.trim()) return dirFiltered;
    
    return dirFiltered.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, direction, searchTerm]);

  const selectedCategory = useMemo(() => 
    categories.find(c => c.id === categoryId), 
  [categories, categoryId]);

  const selectedSubcategory = useMemo(() => 
    subcategories.find(s => s.id === subcategoryId), 
  [subcategories, subcategoryId]);

  const handleSelectCategory = (cat: Category) => {
    onChange(cat.id!, undefined);
    setShowMainModal(false);
    setSearchTerm('');
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || isCreating) return;
    
    setIsCreating(true);
    try {
      const newId = await createCategory(userId, newCatName.trim(), direction);
      notifySuccess("Categoria criada!");
      await load();
      onChange(newId, undefined);
      setIsCreating(false);
      setNewCatName('');
      setShowMainModal(false);
    } catch (err) {
      notifyError("Erro ao criar.");
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Botão de Trigger Principal */}
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase text-gray-400 block tracking-widest">Categoria</label>
        <button 
          type="button"
          onClick={() => setShowMainModal(true)}
          className={`w-full flex items-center justify-between p-4 bg-white border-2 rounded-2xl transition-all ${
            error ? 'border-red-200' : 'border-blue-50 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {selectedCategory ? (
              <>
                <div className={`p-2 rounded-xl ${COLOR_MAP[selectedCategory.colorKey] || 'bg-gray-100'}`}>
                  {IconMap[selectedCategory.iconKey] || <Tag size={18} />}
                </div>
                <span className="font-black text-gray-800 uppercase text-sm">{selectedCategory.name}</span>
              </>
            ) : (
              <span className="text-gray-300 font-bold uppercase text-xs">Selecione uma categoria...</span>
            )}
          </div>
          <ChevronRight size={18} className="text-gray-300" />
        </button>
        {error && <span className="text-[9px] font-bold text-red-500 uppercase">{error}</span>}
      </div>

      {/* Select de Subcategoria (Opcional - aparece se houver dados) */}
      {subcategories.length > 0 && (
        <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
          <label className="text-[10px] font-black uppercase text-gray-400 block tracking-widest">Subcategoria (Opcional)</label>
          <select 
            value={subcategoryId || ''}
            onChange={(e) => onChange(categoryId, e.target.value)}
            className="w-full font-black border-b-4 border-blue-50 bg-transparent py-2 outline-none focus:border-blue-600 text-sm"
          >
            <option value="">Geral / Outros</option>
            {subcategories.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Modal de Busca e Seleção */}
      {showMainModal && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            
            <div className="p-8 border-b border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase tracking-tighter">Escolher Categoria</h3>
                <button type="button" onClick={() => setShowMainModal(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Pesquisar..." 
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-sm outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
              {filteredCategories.map(cat => (
                <button 
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-blue-50 transition-colors text-left group"
                >
                  <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${COLOR_MAP[cat.colorKey] || 'bg-gray-100'}`}>
                    {IconMap[cat.iconKey] || <Tag size={18} />}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-gray-800 uppercase text-xs">{cat.name}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{cat.direction === 'both' ? 'Flexível' : cat.direction === 'credit' ? 'Entrada' : 'Saída'}</p>
                  </div>
                  <ChevronRight size={14} className="text-gray-200" />
                </button>
              ))}

              {filteredCategories.length === 0 && !loading && (
                <div className="py-10 text-center space-y-4">
                  <Tag size={40} className="mx-auto text-gray-100" />
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Nenhuma categoria encontrada</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100">
              <form onSubmit={handleCreateNew} className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nova categoria..."
                  className="flex-1 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-600"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <button 
                  disabled={!newCatName.trim() || isCreating}
                  type="submit" 
                  className="bg-blue-600 text-white p-3 rounded-xl shadow-lg active:scale-90 transition-all disabled:opacity-50"
                >
                  {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelect;
