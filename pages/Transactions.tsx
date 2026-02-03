
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { useLocation } from 'react-router-dom';
import { getTransactions, getAccounts, getCategories, addTransaction, updateTransaction } from '../services/db';
import { Transaction, Account, Category } from '../types';
import { formatCurrency, formatDate, getCurrentMonth, getTodayDate, addMonthsToMonthKey } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { getPreviousMonth } from '../utils/date';
import { useToast } from '../context/ToastContext';
import { Plus, Search, CheckCircle, Clock, X, RefreshCw, AlertCircle, Edit3, Trash2, ArrowRight, History, Loader2 } from 'lucide-react';
import { serverTimestamp, collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import CategorySelect from '../components/CategorySelect';

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
  const { notifySuccess, notifyError, notifyInfo } = useToast();
  const location = useLocation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [formData, setFormData] = useState<Partial<Transaction>>(INITIAL_FORM_STATE());
  const [durationMode, setDurationMode] = useState<'infinite' | 'fixed_months' | 'until_date'>('infinite');
  const [durationMonths, setDurationMonths] = useState(12);
  const [showPropagationModal, setShowPropagationModal] = useState(false);
  const [isProcessingPropagation, setIsProcessingPropagation] = useState(false);

  // Estado de erro de validação
  const [categoryError, setCategoryError] = useState('');

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
    try {
      const [txs, accs] = await Promise.all([
        getTransactions(user!.uid),
        getAccounts(user!.uid)
      ]);
      setTransactions(txs);
      setAccounts(accs);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormData(tx);
    if (!tx.recurrence?.endMonth) setDurationMode('infinite');
    else setDurationMode('until_date');
    setShowModal(true);
    setCategoryError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError('');

    if (!user || !formData.accountId) {
      notifyInfo("Selecione a conta.");
      return;
    }

    // Validação de categoria manual
    if (!formData.categoryId) {
      setCategoryError("Escolha uma categoria ou crie uma nova.");
      return;
    }

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
        notifySuccess("Registro atualizado.");
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
      notifySuccess("Lançamento concluído.");
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
        amount: parseNumericValue(formData.amount),
        description: formData.description,
        accountId: formData.accountId,
        categoryId: formData.categoryId,
        updatedAt: serverTimestamp()
      };

      if (scope === 'single') {
        batch.update(doc(db, 'transactions', editingTx.id!), updates);
      } else if (scope === 'future') {
        const prevMonth = getPreviousMonth(editingTx.competenceMonth);
        const q = query(
          collection(db, 'transactions'), 
          where('recurrence.parentId', '==', editingTx.recurrence.parentId),
          where('userId', '==', user.uid)
        );
        const snap = await getDocs(q);
        const newParentId = crypto.randomUUID();

        snap.docs.forEach(d => {
          const data = d.data();
          if (data.competenceMonth < editingTx.competenceMonth) {
            batch.update(d.ref, { 'recurrence.endMonth': prevMonth });
          } else {
            batch.update(d.ref, { 
              ...updates, 
              'recurrence.parentId': newParentId,
              'recurrence.endMonth': formData.recurrence?.endMonth || null 
            });
          }
        });
      } else if (scope === 'all') {
        const q = query(collection(db, 'transactions'), where('recurrence.parentId', '==', editingTx.recurrence.parentId));
        const snap = await getDocs(q);
        snap.docs.forEach(d => batch.update(d.ref, {
          ...updates,
          'recurrence.endMonth': formData.recurrence?.endMonth || null
        }));
      }

      await batch.commit();
      notifySuccess("Alteração aplicada à série.");
      closeAllModals();
      loadData();
    } catch (err) {
      console.error(err);
      notifyError("Erro ao propagar mudanças.");
    } finally {
      setIsProcessingPropagation(false);
    }
  };

  const closeAllModals = () => {
    setShowModal(false);
    setShowPropagationModal(false);
    setEditingTx(null);
    setFormData(INITIAL_FORM_STATE());
    setCategoryError('');
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
        <div className="fixed inset-0 bg-blue-900/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl p-10 max-h-[90vh] overflow-y-auto relative border-2 border-blue-50">
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
                <input required autoFocus type="text" className="w-full text-2xl font-black border-b-4 border-blue-50 pb-2 outline-none focus:border-blue-600 transition-all" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Conta</label>
                  <select required className="w-full font-black border-b-4 border-blue-50 pb-2 bg-transparent outline-none focus:border-blue-600" value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                    <option value="">Escolha</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                
                <CategorySelect 
                  userId={user!.uid}
                  value={formData.categoryId || ''}
                  direction={formData.type || 'debit'}
                  onChange={(id) => {
                    setFormData({...formData, categoryId: id});
                    setCategoryError('');
                  }}
                  error={categoryError}
                />
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
                    <div className="space-y-3 pt-4 border-t border-emerald-100 animate-in fade-in duration-300">
                       <div className="flex flex-col gap-2">
                          <button type="button" onClick={() => setDurationMode('infinite')} className={`p-3 rounded-xl border-2 text-left transition-all ${durationMode === 'infinite' ? 'bg-white border-emerald-600 font-black shadow-sm' : 'border-transparent text-gray-400'}`}>
                             <span className="text-[10px] uppercase">Sem fim</span>
                          </button>
                          <div className={`p-3 rounded-xl border-2 transition-all ${durationMode === 'fixed_months' ? 'bg-white border-emerald-600 shadow-sm' : 'border-transparent'}`}>
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

              <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
                {editingTx ? 'Confirmar Ajuste' : 'Azular Registro'}
              </button>
            </form>

            {/* Modal de Propagação Modesto */}
            {showPropagationModal && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6 rounded-[3rem] animate-in fade-in duration-300">
                <div className="w-full max-w-sm bg-white border-2 border-emerald-100 rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center text-center space-y-6 animate-in zoom-in duration-300">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    {isProcessingPropagation ? <Loader2 className="animate-spin" size={24} /> : <History size={24} />}
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-black uppercase tracking-tight text-gray-900">Alcance da Edição</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      Onde essa mudança deve valer?
                    </p>
                  </div>

                  <div className="w-full space-y-2 text-left">
                    <button 
                      disabled={isProcessingPropagation}
                      onClick={() => handlePropagationSelection('single')} 
                      className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col items-start hover:border-emerald-300 hover:bg-emerald-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <span className="font-black uppercase text-[10px] text-gray-800 leading-none mb-1">Só este mês</span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Ajuste pontual</span>
                    </button>

                    <button 
                      disabled={isProcessingPropagation}
                      onClick={() => handlePropagationSelection('future')} 
                      className="w-full bg-emerald-600 text-white p-4 rounded-2xl flex flex-col items-start hover:bg-emerald-700 shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      <span className="font-black uppercase text-[10px] leading-none mb-1">Deste mês em diante</span>
                      <span className="text-[8px] font-bold text-emerald-100 uppercase">Alteração definitiva</span>
                    </button>

                    <button 
                      disabled={isProcessingPropagation}
                      onClick={() => handlePropagationSelection('all')} 
                      className="w-full bg-white border-2 border-gray-100 p-4 rounded-2xl flex flex-col items-start hover:border-gray-300 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <span className="font-black uppercase text-[10px] text-gray-800 leading-none mb-1">Toda a série</span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Histórico e futuro</span>
                    </button>
                  </div>

                  <button 
                    disabled={isProcessingPropagation}
                    onClick={() => setShowPropagationModal(false)}
                    className="text-[9px] font-black uppercase text-gray-300 hover:text-red-400 transition-colors"
                  >
                    Cancelar
                  </button>
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
