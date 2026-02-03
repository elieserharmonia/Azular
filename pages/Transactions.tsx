
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { useLocation } from 'react-router-dom';
import { getTransactions, getAccounts, getCategories, addTransaction, updateTransaction } from '../services/db';
import { Transaction, Account, Category, RecurrenceFrequency } from '../types';
import { formatCurrency, formatDate, getCurrentMonth, getTodayDate, addMonthsToMonthKey } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { Plus, Search, CheckCircle, Clock, X, RefreshCw, PlusCircle, Info, Link as LinkIcon, AlertCircle, Edit3, Trash2, ArrowRight, History } from 'lucide-react';
import { serverTimestamp, collection, addDoc, writeBatch, query, where, getDocs, doc } from 'firebase/firestore';
import { db } from '../firebase';

const INITIAL_FORM_STATE = (): Partial<Transaction> => {
  const today = getTodayDate();
  return {
    type: 'debit',
    costType: 'variable',
    description: '',
    plannedAmount: 0,
    amount: 0,
    status: 'done',
    competenceMonth: getCurrentMonth(),
    dueDate: today,
    receiveDate: today,
    isFixed: false,
    recurrence: { 
      enabled: false, 
      frequency: 'monthly',
      interval: 1,
      startMonth: getCurrentMonth(),
      endMonth: null,
      parentId: null
    }
  };
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

  const [formData, setFormData] = useState<Partial<Transaction>>(INITIAL_FORM_STATE());
  const [durationMode, setDurationMode] = useState<'infinite' | 'fixed_months' | 'until_date'>('infinite');
  const [durationMonths, setDurationMonths] = useState(12);
  const [showPropagationModal, setShowPropagationModal] = useState(false);
  const [isProcessingPropagation, setIsProcessingPropagation] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
    if (location.state?.openModal) {
      setFormData(INITIAL_FORM_STATE());
      setShowModal(true);
    }
  }, [user, location]);

  const loadData = async () => {
    setLoading(true);
    const [txs, accs, cats] = await Promise.all([
      getTransactions(user!.uid),
      getAccounts(user!.uid),
      getCategories(user!.uid)
    ]);
    setTransactions(txs);
    setAccounts(accs);
    setCategories(cats);
    setLoading(false);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormData(tx);
    if (!tx.recurrence?.endMonth) setDurationMode('infinite');
    else setDurationMode('until_date');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.accountId || !formData.categoryId) return;

    let finalEndMonth: string | null = null;
    if (durationMode === 'fixed_months') finalEndMonth = addMonthsToMonthKey(formData.competenceMonth!, durationMonths - 1);
    else if (durationMode === 'until_date') finalEndMonth = formData.recurrence?.endMonth || null;

    const updatedData = {
      ...formData,
      amount: parseNumericValue(formData.amount),
      recurrence: { ...formData.recurrence!, endMonth: finalEndMonth }
    };

    if (editingTx) {
      if (editingTx.isFixed) {
        setFormData(updatedData);
        setShowPropagationModal(true);
      } else {
        await updateTransaction(editingTx.id!, updatedData);
        closeAllModals();
        loadData();
      }
    } else {
      const parentId = updatedData.isFixed ? crypto.randomUUID() : null;
      await addTransaction({
        ...updatedData as Transaction,
        userId: user.uid,
        status: 'done',
        recurrence: { ...updatedData.recurrence!, parentId }
      });
      closeAllModals();
      loadData();
    }
  };

  const handlePropagationSelection = async (scope: 'single' | 'all' | 'future') => {
    if (!user || !editingTx || isProcessingPropagation) return;
    setIsProcessingPropagation(true);
    try {
      const batch = writeBatch(db);
      const updates = {
        amount: formData.amount,
        description: formData.description,
        accountId: formData.accountId,
        categoryId: formData.categoryId,
        'recurrence.endMonth': formData.recurrence?.endMonth,
        updatedAt: serverTimestamp()
      };

      if (scope === 'single') {
        batch.update(doc(db, 'transactions', editingTx.id!), updates);
      } else {
        const q = query(collection(db, 'transactions'), where('recurrence.parentId', '==', editingTx.recurrence.parentId));
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
          if (scope === 'all' || (scope === 'future' && d.data().competenceMonth >= editingTx.competenceMonth)) {
            batch.update(d.ref, updates);
          }
        });
      }
      await batch.commit();
      closeAllModals();
      loadData();
    } catch (err) {
      alert("Erro ao propagar.");
    } finally {
      setIsProcessingPropagation(false);
    }
  };

  const closeAllModals = () => {
    setShowModal(false);
    setShowPropagationModal(false);
    setEditingTx(null);
    setFormData(INITIAL_FORM_STATE());
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => t.status === 'done')
      .filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => (b.receiveDate || b.dueDate || '').localeCompare(a.receiveDate || a.dueDate || ''));
  }, [transactions, searchTerm]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase text-gray-900 leading-none">Lançamentos</h2>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-500" /> Histórico Real
          </p>
        </div>
        <button 
          onClick={() => { setFormData(INITIAL_FORM_STATE()); setEditingTx(null); setShowModal(true); }}
          className="bg-emerald-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 hover:scale-105 transition-all"
        >
          <Plus size={24} /> Registrar
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Pesquisar registros..." 
          className="w-full pl-12 pr-6 py-5 rounded-3xl border-2 border-blue-50 font-bold outline-none focus:border-blue-600 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4 pb-20">
        {filteredTransactions.map(tx => (
          <div key={tx.id} onClick={() => handleOpenEdit(tx)} className="bg-white p-6 rounded-[2.5rem] border-2 border-blue-50 flex items-center justify-between shadow-sm hover:border-blue-200 transition-all cursor-pointer group">
            <div className="flex items-center gap-5">
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-gray-800 text-lg uppercase leading-none">{tx.description}</h4>
                  {tx.isFixed && <RefreshCw size={14} className="text-blue-500" />}
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
              <span className="text-[8px] font-black text-gray-300 uppercase">{tx.isFixed ? 'Série Ativa' : 'Único'}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl p-10 max-h-[90vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter">
                {editingTx ? 'Ajustar Lançamento' : 'Novo Registro'}
              </h3>
              <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={32} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex p-2 bg-blue-50 rounded-[1.5rem]">
                <button type="button" onClick={() => setFormData({...formData, type: 'credit'})} className={`flex-1 py-4 font-black uppercase rounded-[1.2rem] transition-all ${formData.type === 'credit' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400'}`}>Entrada</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'debit'})} className={`flex-1 py-4 font-black uppercase rounded-[1.2rem] transition-all ${formData.type === 'debit' ? 'bg-white text-red-500 shadow-md' : 'text-gray-400'}`}>Saída</button>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Descrição</label>
                <input required autoFocus type="text" className="w-full text-2xl font-black border-b-4 border-blue-50 pb-2 outline-none focus:border-blue-600" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-emerald-600 block mb-2 tracking-widest">Valor Real</label>
                  <input required type="text" className="w-full text-3xl font-black border-b-4 border-emerald-100 pb-2 outline-none focus:border-emerald-600" value={formData.amount === 0 ? '' : formData.amount} onChange={e => setFormData({...formData, amount: e.target.value as any})} placeholder="0,00" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Data</label>
                  <input required type="date" className="w-full text-xl font-black border-b-4 border-blue-50 pb-2 outline-none" value={formData.type === 'credit' ? formData.receiveDate : formData.dueDate} onChange={e => setFormData({...formData, [formData.type === 'credit' ? 'receiveDate' : 'dueDate']: e.target.value, competenceMonth: e.target.value.substring(0, 7)})} />
                </div>
              </div>

              <div className="p-6 bg-emerald-50 rounded-[2rem] border-2 border-emerald-100 space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <RefreshCw size={20} className="text-emerald-600" />
                       <span className="text-xs font-black uppercase text-gray-700">Recorrente</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                       <input type="checkbox" className="sr-only peer" checked={formData.isFixed} onChange={e => setFormData({...formData, isFixed: e.target.checked})} />
                       <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                 </div>

                 {formData.isFixed && (
                    <div className="space-y-3 pt-4 border-t border-emerald-100">
                       <div className="flex flex-col gap-2">
                          <button type="button" onClick={() => setDurationMode('infinite')} className={`p-3 rounded-xl border-2 text-left transition-all ${durationMode === 'infinite' ? 'bg-white border-emerald-600 font-black' : 'border-transparent text-gray-400'}`}>
                             <span className="text-[10px] uppercase">Sem fim</span>
                          </button>
                          <div className={`p-3 rounded-xl border-2 transition-all ${durationMode === 'fixed_months' ? 'bg-white border-emerald-600' : 'border-transparent'}`}>
                             <div className="flex items-center justify-between">
                                <button type="button" onClick={() => setDurationMode('fixed_months')} className={`text-[10px] uppercase font-black ${durationMode === 'fixed_months' ? 'text-emerald-600' : 'text-gray-400'}`}>Por X meses</button>
                                {durationMode === 'fixed_months' && (
                                   <input type="number" className="w-16 bg-emerald-50 text-center font-black rounded" value={durationMonths} onChange={e => setDurationMonths(parseInt(e.target.value))} />
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                 )}
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-95">
                {editingTx ? 'Confirmar Ajuste' : 'Azular Registro'}
              </button>
            </form>

            {showPropagationModal && (
              <div className="absolute inset-0 bg-blue-900/95 backdrop-blur-md z-[120] flex items-center justify-center p-8 rounded-[3rem] animate-in fade-in duration-300">
                <div className="w-full max-w-sm space-y-8 text-white text-center">
                  <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <History size={40} className={isProcessingPropagation ? 'animate-spin' : ''} />
                  </div>
                  <h4 className="text-2xl font-black uppercase tracking-tighter">Alcance da Edição</h4>
                  <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest leading-relaxed">
                    Este item faz parte de uma série recorrente.<br/>
                    Como quer aplicar as mudanças?
                  </p>

                  <div className="space-y-3">
                    <button onClick={() => handlePropagationSelection('single')} className="w-full bg-white text-blue-900 p-5 rounded-2xl flex items-center gap-4 hover:scale-102 transition-all active:scale-95 text-left">
                       <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Clock size={20} /></div>
                       <div>
                          <span className="font-black uppercase text-[10px] block leading-none">Somente este mês</span>
                          <span className="text-[8px] font-bold text-gray-400 uppercase">Mudança temporária</span>
                       </div>
                    </button>
                    <button onClick={() => handlePropagationSelection('future')} className="w-full bg-emerald-600 text-white p-5 rounded-2xl flex items-center gap-4 hover:scale-102 transition-all active:scale-95 text-left">
                       <div className="p-3 bg-white/20 text-white rounded-xl"><ArrowRight size={20} /></div>
                       <div>
                          <span className="font-black uppercase text-[10px] block leading-none">Deste mês em diante</span>
                          <span className="text-[8px] font-bold text-emerald-100 uppercase">Alteração definitiva</span>
                       </div>
                    </button>
                    <button onClick={() => handlePropagationSelection('all')} className="w-full bg-transparent border-2 border-white/20 text-white p-5 rounded-2xl flex items-center gap-4 hover:scale-102 transition-all active:scale-95 text-left">
                       <div className="p-3 bg-white/5 text-white rounded-xl"><History size={20} /></div>
                       <div>
                          <span className="font-black uppercase text-[10px] block leading-none">Toda a série</span>
                          <span className="text-[8px] font-bold text-blue-200 uppercase">Ajustar histórico e futuro</span>
                       </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
