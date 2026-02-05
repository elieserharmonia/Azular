import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { useLocation } from 'react-router-dom';
import { getTransactions, getAccounts, getCategories, addTransaction, updateTransaction } from '../services/db';
import { Transaction, Account, Category } from '../types';
import { formatCurrency, formatDate, getCurrentMonth, getTodayDate, addMonthsToMonthKey } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { useToast } from '../context/ToastContext';
import { firebaseEnabled } from '../lib/firebase';
import { Plus, Search, CheckCircle, X, RefreshCw, Edit3, Trash2, History, Loader2, Sparkles } from 'lucide-react';
import { serverTimestamp, collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { getDb } from '../services/firestoreClient';
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
  const [durationMode, setDurationMode] = useState<'infinite' | 'until_date'>('infinite');
  const [showPropagationModal, setShowPropagationModal] = useState(false);
  const [isProcessingPropagation, setIsProcessingPropagation] = useState(false);

  const [categoryError, setCategoryError] = useState('');
  const [foundProvision, setFoundProvision] = useState<Transaction | null>(null);

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

  // Verifica se existe previsão para o que está sendo digitado
  useEffect(() => {
    if (!formData.description || formData.description.length < 3 || editingTx) {
      setFoundProvision(null);
      return;
    }

    const match = transactions.find(t => 
      t.status === 'planned' && 
      t.type === formData.type &&
      t.description.toLowerCase().trim() === formData.description!.toLowerCase().trim() &&
      t.competenceMonth === formData.competenceMonth
    );

    setFoundProvision(match || null);
    // Se achou, sugere a categoria e o valor planejado automaticamente
    if (match) {
      setFormData(prev => ({
        ...prev,
        categoryId: match.categoryId,
        accountId: match.accountId,
        amount: prev.amount === 0 ? parseNumericValue(match.plannedAmount || match.amount) : prev.amount
      }));
    }
  }, [formData.description, formData.type, formData.competenceMonth, transactions, editingTx]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError('');

    if (!user || !formData.accountId) {
      notifyInfo("Selecione a conta.");
      return;
    }

    if (!formData.categoryId) {
      setCategoryError("Escolha uma categoria.");
      return;
    }

    const updatedData = {
      ...formData,
      amount: parseNumericValue(formData.amount),
    };

    try {
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
        if (foundProvision) {
          // "Realiza" a previsão existente
          await updateTransaction(foundProvision.id!, {
            ...updatedData,
            status: 'done',
            plannedAmount: foundProvision.plannedAmount || foundProvision.amount
          });
          notifySuccess("Previsão baixada com sucesso!");
        } else {
          const parentId = updatedData.isFixed ? crypto.randomUUID() : null;
          await addTransaction({
            ...updatedData as Transaction,
            userId: user.uid,
            status: 'done',
            recurrence: { ...updatedData.recurrence!, parentId }
          });
          notifySuccess("Lançamento concluído.");
        }
        closeAllModals();
        loadData();
      }
    } catch (err) {
      notifyError("Erro ao salvar lançamento.");
    }
  };

  const handlePropagationSelection = async (scope: 'single' | 'all' | 'future') => {
    if (!user || !editingTx || isProcessingPropagation) return;
    setIsProcessingPropagation(true);

    const cleanUpdates = {
      amount: parseNumericValue(formData.amount),
      description: formData.description,
      accountId: formData.accountId,
      categoryId: formData.categoryId,
    };

    try {
      if (!firebaseEnabled) {
        const docs = JSON.parse(localStorage.getItem('azular_demo_transactions') || '[]');
        let updated;
        if (scope === 'single') {
          updated = docs.map((d: any) => d.id === editingTx.id ? {...d, ...cleanUpdates} : d);
        } else if (scope === 'all') {
          updated = docs.map((d: any) => d.recurrence?.parentId === editingTx.recurrence.parentId ? {...d, ...cleanUpdates} : d);
        } else {
          updated = docs.map((d: any) => (d.recurrence?.parentId === editingTx.recurrence.parentId && (d.receiveDate || d.dueDate) >= (editingTx.receiveDate || editingTx.dueDate)) ? {...d, ...cleanUpdates} : d);
        }
        localStorage.setItem('azular_demo_transactions', JSON.stringify(updated));
      } else {
        const db = await getDb();
        const batch = writeBatch(db);
        const fbUpdates = { ...cleanUpdates, updatedAt: serverTimestamp() };

        if (scope === 'single') {
          batch.update(doc(db, 'transactions', editingTx.id!), fbUpdates);
        } else {
          const q = query(
            collection(db, 'transactions'), 
            where('recurrence.parentId', '==', editingTx.recurrence.parentId),
            where('userId', '==', user.uid)
          );
          const snap = await getDocs(q);
          snap.docs.forEach(d => {
            const data = d.data();
            if (scope === 'all' || (scope === 'future' && (data.receiveDate || data.dueDate) >= (editingTx.receiveDate || editingTx.dueDate))) {
              batch.update(d.ref, fbUpdates);
            }
          });
        }
        await batch.commit();
      }
      notifySuccess("Série atualizada.");
      closeAllModals();
      loadData();
    } catch (err) {
      notifyError("Erro ao propagar.");
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
    setFoundProvision(null);
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
            <CheckCircle size={14} className="text-emerald-500" /> Histórico Financeiro
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
          placeholder="Pesquisar lançamentos..." 
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
              <span className="text-[8px] font-black text-gray-300 uppercase">{tx.isFixed ? 'Mensal' : 'Único'}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-blue-900/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl p-10 max-h-[90vh] overflow-y-auto relative border-2 border-blue-50">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter">
                {editingTx ? 'Ajustar Registro' : 'Lançar Real'}
              </h3>
              <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={32} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex p-2 bg-blue-50 rounded-[1.5rem]">
                <button type="button" onClick={() => setFormData({...formData, type: 'credit'})} className={`flex-1 py-4 font-black uppercase rounded-[1.2rem] transition-all ${formData.type === 'credit' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400'}`}>Recebido</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'debit'})} className={`flex-1 py-4 font-black uppercase rounded-[1.2rem] transition-all ${formData.type === 'debit' ? 'bg-white text-red-500 shadow-md' : 'text-gray-400'}`}>Pago</button>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">O que foi?</label>
                <input required autoFocus type="text" className="w-full text-2xl font-black border-b-4 border-blue-50 pb-2 outline-none focus:border-blue-600 transition-all" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                
                {foundProvision && (
                  <div className="mt-2 bg-emerald-50 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <Sparkles className="text-emerald-600 shrink-0" size={18} />
                    <p className="text-[10px] font-black uppercase text-emerald-800 tracking-tight leading-tight">
                      Vínculo automático: Localizamos sua previsão de {formatCurrency(foundProvision.plannedAmount || foundProvision.amount)}.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-emerald-600 block mb-2 tracking-widest">Valor Real</label>
                  <input required type="text" className="w-full text-3xl font-black border-b-4 border-emerald-100 pb-2 outline-none focus:border-emerald-600" value={formData.amount === 0 ? '' : (formData.amount || '')} onChange={e => setFormData({...formData, amount: e.target.value as any})} placeholder="0,00" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Data</label>
                  <input required type="date" className="w-full text-xl font-black border-b-4 border-blue-50 pb-2 outline-none" value={(formData.type === 'credit' ? formData.receiveDate : formData.dueDate) || ''} onChange={e => setFormData({...formData, [formData.type === 'credit' ? 'receiveDate' : 'dueDate']: e.target.value, competenceMonth: e.target.value.substring(0, 7)})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Qual Conta?</label>
                  <select required className="w-full font-black border-b-4 border-blue-50 pb-2 bg-transparent outline-none focus:border-blue-600" value={formData.accountId || ''} onChange={e => setFormData({...formData, accountId: e.target.value})}>
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
                       <input type="checkbox" className="sr-only peer" checked={formData.isFixed || false} onChange={e => setFormData({...formData, isFixed: e.target.checked})} />
                       <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                 </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
                {editingTx ? 'Salvar Mudanças' : 'Confirmar Lançamento'}
              </button>
            </form>

            {showPropagationModal && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6 rounded-[3rem] animate-in fade-in duration-300">
                <div className="w-full max-w-sm bg-white border-2 border-emerald-100 rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center text-center space-y-6">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    {isProcessingPropagation ? <Loader2 className="animate-spin" size={24} /> : <History size={24} />}
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-black uppercase tracking-tight text-gray-900">Atualizar Série</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      Onde essa alteração deve ser aplicada?
                    </p>
                  </div>

                  <div className="w-full space-y-2 text-left">
                    <button 
                      disabled={isProcessingPropagation}
                      onClick={() => handlePropagationSelection('single')} 
                      className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col items-start hover:border-emerald-300 hover:bg-emerald-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <span className="font-black uppercase text-[10px] text-gray-800 leading-none mb-1">Apenas este mês</span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Ajuste único</span>
                    </button>

                    <button 
                      disabled={isProcessingPropagation}
                      onClick={() => handlePropagationSelection('future')} 
                      className="w-full bg-emerald-600 text-white p-4 rounded-2xl flex flex-col items-start hover:bg-emerald-700 shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      <span className="font-black uppercase text-[10px] leading-none mb-1">Deste mês em diante</span>
                      <span className="text-[8px] font-bold text-emerald-100 uppercase">Mudança para o futuro</span>
                    </button>

                    <button 
                      disabled={isProcessingPropagation}
                      onClick={() => handlePropagationSelection('all')} 
                      className="w-full bg-white border-2 border-gray-100 p-4 rounded-2xl flex flex-col items-start hover:border-gray-300 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <span className="font-black uppercase text-[10px] text-gray-800 leading-none mb-1">Toda a série</span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Ajustar todo o histórico</span>
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