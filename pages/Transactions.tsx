
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { useLocation } from 'react-router-dom';
import { getTransactions, getAccounts, getCategories, addTransaction, updateTransaction } from '../services/db';
import { Transaction, Account, Category, RecurrenceFrequency } from '../types';
import { formatCurrency, formatDate, getCurrentMonth } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { Plus, Search, CheckCircle, Clock, X, RefreshCw, PlusCircle, Info, Link as LinkIcon } from 'lucide-react';
import { serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const INITIAL_FORM_STATE: Partial<Transaction> = {
  type: 'debit',
  costType: 'variable',
  description: '',
  plannedAmount: 0,
  amount: 0,
  status: 'done', // Padrão para registro real é finalizado
  competenceMonth: getCurrentMonth(),
  isFixed: false,
  recurrence: { 
    enabled: false, 
    frequency: 'monthly',
    interval: 1,
    endDate: null,
    occurrences: 1,
    parentId: null
  }
};

const Transactions: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [formData, setFormData] = useState<Partial<Transaction>>(INITIAL_FORM_STATE);

  useEffect(() => {
    if (!user) return;
    loadData();
    // Verifica se veio de um FAB global para abrir o modal direto
    if (location.state?.openModal) {
      setFormData(INITIAL_FORM_STATE);
      setShowModal(true);
    }
  }, [user, location]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, accs, cats] = await Promise.all([
        getTransactions(user!.uid),
        getAccounts(user!.uid),
        getCategories(user!.uid)
      ]);
      setTransactions(txs);
      setAccounts(accs);
      setCategories(cats);
    } catch (err: any) {
      console.error("Load Data Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const provisionedInMonth = useMemo(() => {
    return transactions.filter(t => t.status === 'planned' && t.competenceMonth === formData.competenceMonth);
  }, [transactions, formData.competenceMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.accountId || !formData.categoryId) {
       alert("Preencha conta e categoria.");
       return;
    }

    try {
      const dataToSave = {
        ...formData,
        plannedAmount: parseNumericValue(formData.plannedAmount || 0),
        amount: parseNumericValue(formData.amount || 0),
        status: 'done' as any,
        updatedAt: serverTimestamp()
      };

      if (editingTx?.id) {
        await updateTransaction(editingTx.id, dataToSave);
      } else {
        await addTransaction({
          ...dataToSave as Transaction,
          userId: user.uid
        });
        
        // Se houver vínculo com provisão, atualizar a provisão para status 'done' (ou similar logicamente)
        if (formData.linkedProvisionId) {
          const provision = transactions.find(t => t.id === formData.linkedProvisionId);
          if (provision) {
             await updateTransaction(provision.id!, { status: 'done', amount: parseNumericValue(formData.amount) });
          }
        }
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => t.status === 'done')
      .filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const dateA = a.receiveDate || a.dueDate || '';
        const dateB = b.receiveDate || b.dueDate || '';
        return dateB.localeCompare(dateA);
      });
  }, [transactions, searchTerm]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase text-gray-900 leading-none">Lançamentos Reais</h2>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-500" /> O que aconteceu de fato
          </p>
        </div>
        <button 
          onClick={() => { setFormData(INITIAL_FORM_STATE); setEditingTx(null); setShowModal(true); }}
          className="w-full md:w-auto bg-emerald-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:scale-105 transition-all"
        >
          <Plus size={24} /> Registrar Agora
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Pesquisar nos registros reais..." 
          className="w-full pl-12 pr-6 py-5 rounded-3xl border-2 border-blue-50 font-bold focus:border-blue-600 outline-none transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4 pb-20">
        {filteredTransactions.map(tx => (
          <div 
            key={tx.id} 
            onClick={() => { setEditingTx(tx); setFormData(tx); setShowModal(true); }}
            className="bg-white p-6 rounded-[2.5rem] border-2 border-blue-50 flex items-center justify-between shadow-sm hover:border-blue-200 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-5">
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-gray-800 text-lg uppercase leading-none">{tx.description}</h4>
                  {tx.linkedProvisionId && <LinkIcon size={14} className="text-blue-500" />}
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 block">
                  {accounts.find(a => a.id === tx.accountId)?.name} • {formatDate(tx.dueDate || tx.receiveDate || '')}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-black ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-500'} tracking-tighter`}>
                {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
              </div>
              <span className="text-[8px] font-black text-gray-300 uppercase">Realizado</span>
            </div>
          </div>
        ))}
        {filteredTransactions.length === 0 && !loading && (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-blue-50">
             <Clock size={48} className="mx-auto text-gray-100 mb-4" />
             <p className="text-[10px] font-black uppercase text-gray-400">Nenhum lançamento real encontrado.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl p-10 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter">
                {editingTx ? 'Ajustar Lançamento' : 'Novo Lançamento Real'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={32} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="flex p-2 bg-blue-50 rounded-[1.5rem]">
                <button type="button" onClick={() => setFormData({...formData, type: 'credit'})} className={`flex-1 py-4 font-black uppercase rounded-[1.2rem] transition-all ${formData.type === 'credit' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400'}`}>Entrada</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'debit'})} className={`flex-1 py-4 font-black uppercase rounded-[1.2rem] transition-all ${formData.type === 'debit' ? 'bg-white text-red-500 shadow-md' : 'text-gray-400'}`}>Saída</button>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">O que você pagou/recebeu?</label>
                <input required autoFocus type="text" className="w-full text-2xl font-black border-b-4 border-blue-50 pb-2 outline-none focus:border-blue-600 transition-colors" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Ex: Farmácia, Mercado..." />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                   <label className="text-[10px] font-black uppercase text-blue-600 block mb-2 tracking-widest">Valor Real</label>
                   <input required type="text" className="w-full text-3xl font-black border-b-4 border-blue-600 pb-2 outline-none" value={formData.amount === 0 ? '' : formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0,00" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Data</label>
                  <input required type="date" className="w-full text-xl font-black border-b-4 border-blue-50 pb-2 outline-none focus:border-blue-600" value={formData.type === 'credit' ? formData.receiveDate : formData.dueDate} onChange={e => {
                    const d = e.target.value;
                    setFormData({...formData, [formData.type === 'credit' ? 'receiveDate' : 'dueDate']: d, competenceMonth: d.substring(0, 7)});
                  }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Conta</label>
                  <select required className="w-full font-black border-b-4 border-blue-50 pb-2 bg-transparent outline-none focus:border-blue-600" value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                    <option value="">Selecione</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Categoria</label>
                  <select required className="w-full font-black border-b-4 border-blue-50 pb-2 bg-transparent outline-none focus:border-blue-600" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                    <option value="">Escolha</option>
                    {categories.filter(c => c.direction === formData.type || c.direction === 'both').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Vincular à Provisão */}
              <div className="bg-gray-50 p-6 rounded-[2rem] border-2 border-gray-100 space-y-4">
                 <div className="flex items-center gap-2">
                   <LinkIcon size={18} className="text-blue-600" />
                   <span className="font-black uppercase text-[10px] text-gray-600 tracking-widest">Vincular a um plano previsto?</span>
                 </div>
                 <select 
                   className="w-full bg-white border border-gray-200 p-3 rounded-xl font-bold text-xs"
                   value={formData.linkedProvisionId || ''}
                   onChange={e => {
                     const val = e.target.value;
                     const prov = provisionedInMonth.find(p => p.id === val);
                     setFormData({
                       ...formData, 
                       linkedProvisionId: val,
                       categoryId: prov ? prov.categoryId : formData.categoryId,
                       plannedAmount: prov ? prov.plannedAmount : formData.plannedAmount
                     });
                   }}
                 >
                   <option value="">Não vincular (Gasto novo/extra)</option>
                   {provisionedInMonth.map(p => (
                     <option key={p.id} value={p.id}>{p.description} ({formatCurrency(p.plannedAmount)})</option>
                   ))}
                 </select>
                 <p className="text-[8px] font-black text-gray-400 uppercase italic">Vincular ajuda a bater o previsto vs real no final do mês.</p>
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-emerald-700 transition-all active:scale-95">
                {editingTx ? 'Salvar Alteração' : 'Azular Lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
