
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { getTransactions, addTransaction, updateTransaction, getAccounts, getCategories, deleteTransaction } from '../services/db';
import { Transaction, Account, Category } from '../types';
import { formatCurrency, getCurrentMonth, getMonthName, getTodayDate, addMonthsToMonthKey } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { getPreviousMonth } from '../utils/date';
import { useToast } from '../context/ToastContext';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Line, Bar
} from 'recharts';
import { 
  Waves, Target, Calendar, Plus, RefreshCw, AlertCircle, X, Edit3, Trash2, ArrowRight, History, CalendarRange, Layers, Clock, Loader2
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import ChartShell from '../components/ChartShell';
import SimpleBars from '../components/SimpleBars';
import BannerAd from '../components/BannerAd';
import CategorySelect from '../components/CategorySelect';

const INITIAL_PROVISION_STATE = (): Partial<Transaction> => ({
  type: 'debit',
  description: '',
  plannedAmount: 0,
  amount: 0,
  status: 'planned',
  competenceMonth: getCurrentMonth(),
  dueDate: getTodayDate(),
  isFixed: true,
  recurrence: { 
    enabled: true, 
    frequency: 'monthly',
    interval: 1,
    startMonth: getCurrentMonth(),
    endMonth: null,
    parentId: null
  }
});

const Provision: React.FC = () => {
  const { user } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<Partial<Transaction>>(INITIAL_PROVISION_STATE());

  const [durationMode, setDurationMode] = useState<'infinite' | 'fixed_months' | 'until_date'>('infinite');
  const [durationMonths, setDurationMonths] = useState(12);

  const [showPropagationModal, setShowPropagationModal] = useState(false);
  const [isProcessingPropagation, setIsProcessingPropagation] = useState(false);

  // Estado de erro de validação
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, accs] = await Promise.all([
        getTransactions(user!.uid),
        getAccounts(user!.uid)
      ]);
      setTransactions(txs);
      setAccounts(accs);
    } catch (err) {
      notifyError("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const provisionedItems = useMemo(() => {
    return transactions.filter(t => t.status === 'planned' || t.isFixed);
  }, [transactions]);

  const projectionData = useMemo(() => {
    if (loading) return [];
    const months: Record<string, any> = {};
    const now = new Date();
    
    for (let i = -6; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { name: getMonthName(key).split(' de ')[0], plannedIncome: 0, plannedExpense: 0, key };
    }

    transactions.forEach(t => {
      const m = t.competenceMonth;
      if (months[m]) {
        const val = parseNumericValue(t.plannedAmount || t.amount);
        if (t.type === 'credit') months[m].plannedIncome += val;
        else months[m].plannedExpense += val;
      }
    });

    return Object.values(months).sort((a: any, b: any) => a.key.localeCompare(b.key));
  }, [transactions, loading]);

  const handleOpenEdit = (item: Transaction) => {
    setEditingItem(item);
    setFormData(item);
    if (!item.recurrence.endMonth) setDurationMode('infinite');
    else setDurationMode('until_date');
    setShowProvisionModal(true);
    setCategoryError('');
  };

  const handleSaveProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError('');

    if (!user || !formData.accountId) {
      notifyInfo("Selecione a Conta.");
      return;
    }

    if (!formData.categoryId) {
      setCategoryError("Escolha uma categoria ou crie uma nova.");
      return;
    }

    let finalEndMonth: string | null = null;
    if (durationMode === 'fixed_months') {
      finalEndMonth = addMonthsToMonthKey(formData.competenceMonth!, durationMonths - 1);
    } else if (durationMode === 'until_date') {
      finalEndMonth = formData.recurrence?.endMonth || null;
    }

    const updatedFormData = {
      ...formData,
      plannedAmount: parseNumericValue(formData.plannedAmount),
      recurrence: {
        ...formData.recurrence!,
        endMonth: finalEndMonth
      }
    };

    if (editingItem) {
      if (editingItem.isFixed) {
        setFormData(updatedFormData);
        setShowPropagationModal(true);
      } else {
        await updateTransaction(editingItem.id!, updatedFormData);
        notifySuccess("Alteração salva.");
        closeAllModals();
        loadData();
      }
    } else {
      try {
        const parentId = updatedFormData.isFixed ? crypto.randomUUID() : null;
        await addTransaction({
          ...updatedFormData as Transaction,
          userId: user.uid,
          amount: 0,
          status: 'planned',
          recurrence: {
            ...updatedFormData.recurrence!,
            parentId: parentId
          }
        });
        notifySuccess("Planejamento fixado.");
        closeAllModals();
        loadData();
      } catch (err) {
        notifyError("Erro ao salvar provisão.");
      }
    }
  };

  const closeAllModals = () => {
    setShowProvisionModal(false);
    setShowPropagationModal(false);
    setEditingItem(null);
    setFormData(INITIAL_PROVISION_STATE());
    setDurationMode('infinite');
    setCategoryError('');
  };

  const handlePropagationSelection = async (scope: 'single' | 'all' | 'future') => {
    if (!user || !editingItem || isProcessingPropagation) return;
    setIsProcessingPropagation(true);

    try {
      const batch = writeBatch(db);
      const cleanUpdates = {
        plannedAmount: parseNumericValue(formData.plannedAmount),
        description: formData.description || editingItem.description,
        accountId: formData.accountId || editingItem.accountId,
        categoryId: formData.categoryId || editingItem.categoryId,
        updatedAt: serverTimestamp()
      };

      if (scope === 'single') {
        batch.update(doc(db, 'transactions', editingItem.id!), cleanUpdates);
      } 
      else if (scope === 'future') {
        const prevMonth = getPreviousMonth(editingItem.competenceMonth);
        const q = query(
          collection(db, 'transactions'), 
          where('recurrence.parentId', '==', editingItem.recurrence.parentId),
          where('userId', '==', user.uid)
        );
        const snap = await getDocs(q);
        const newParentId = crypto.randomUUID();

        snap.docs.forEach(d => {
          const data = d.data();
          if (data.competenceMonth < editingItem.competenceMonth) {
            batch.update(d.ref, { 'recurrence.endMonth': prevMonth });
          } else {
            batch.update(d.ref, { 
              ...cleanUpdates, 
              'recurrence.parentId': newParentId,
              'recurrence.startMonth': editingItem.competenceMonth,
              'recurrence.endMonth': formData.recurrence?.endMonth || null
            });
          }
        });
      } 
      else if (scope === 'all') {
        const q = query(
          collection(db, 'transactions'), 
          where('recurrence.parentId', '==', editingItem.recurrence.parentId),
          where('userId', '==', user.uid)
        );
        const snap = await getDocs(q);
        snap.docs.forEach(d => batch.update(d.ref, {
          ...cleanUpdates,
          'recurrence.endMonth': formData.recurrence?.endMonth || null
        }));
      }

      await batch.commit();
      notifySuccess("Série atualizada com sucesso.");
      closeAllModals();
      loadData();
    } catch (err) {
      console.error("Propagation Error:", err);
      notifyError("Não consegui aplicar a alteração em massa.");
    } finally {
      setIsProcessingPropagation(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (window.confirm("Remover do seu plano?")) {
      try {
        await deleteTransaction(id);
        notifySuccess("Item removido.");
        loadData();
      } catch (err) {
        notifyError("Erro ao excluir.");
      }
    }
  };

  return (
    <div className="space-y-10 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">Provisão</h2>
          <p className="text-blue-500 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
            <CalendarRange size={14} /> Ciclos de Vida Financeira
          </p>
        </div>
        <button 
          onClick={() => setShowProvisionModal(true)}
          className="bg-blue-600 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          + Novo Planejamento
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-50 shadow-sm">
            <h3 className="font-black uppercase text-xs text-gray-400 mb-6 flex items-center gap-2">
              <Layers size={16} className="text-blue-600" /> Séries Ativas
            </h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
              {provisionedItems.map(item => (
                <div key={item.id} className="p-5 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-blue-100 transition-all group">
                   <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase text-gray-800">{item.description}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleOpenEdit(item)} className="p-1.5 text-blue-600 hover:bg-white rounded-lg"><Edit3 size={14} /></button>
                         <button onClick={() => handleDeleteItem(item.id!)} className="p-1.5 text-red-400 hover:bg-white rounded-lg"><Trash2 size={14} /></button>
                      </div>
                   </div>
                   <div className="flex justify-between items-end">
                      <div className="text-xl font-black text-gray-900 tracking-tighter">{formatCurrency(item.plannedAmount)}</div>
                      <div className="text-right">
                         <span className="text-[8px] font-black uppercase text-blue-400 block">
                           {item.recurrence.endMonth ? `Até ${item.recurrence.endMonth}` : 'Sem fim'}
                         </span>
                         <span className="text-[8px] font-bold text-gray-300 uppercase">{item.competenceMonth}</span>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
           <ChartShell title="Visão de Futuro (24 Meses)" hasData={projectionData.length > 0} heightClass="h-[400px]" fallback={<SimpleBars data={projectionData} />}>
              <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={projectionData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f7ff" />
                    <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 'black'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 9, fontWeight: 'black'}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
                    <Bar dataKey="plannedIncome" name="Entradas" fill="#60A5FA" radius={[4, 4, 0, 0]} barSize={10} />
                    <Bar dataKey="plannedExpense" name="Saídas" fill="#F87171" radius={[4, 4, 0, 0]} barSize={10} />
                 </ComposedChart>
              </ResponsiveContainer>
           </ChartShell>
        </div>
      </div>

      <BannerAd />

      {showProvisionModal && (
        <div className="fixed inset-0 bg-blue-900/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl p-10 max-h-[90vh] overflow-y-auto relative border-2 border-blue-50">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter">
                {editingItem ? 'Editar Plano' : 'Novo Planejamento'}
              </h3>
              <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={32} /></button>
            </div>

            <form onSubmit={handleSaveProvision} className="space-y-6">
              <div className="flex p-2 bg-blue-50 rounded-[1.5rem]">
                <button type="button" onClick={() => setFormData({...formData, type: 'credit'})} className={`flex-1 py-4 font-black uppercase rounded-[1.2rem] transition-all ${formData.type === 'credit' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400'}`}>Entrada</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'debit'})} className={`flex-1 py-4 font-black uppercase rounded-[1.2rem] transition-all ${formData.type === 'debit' ? 'bg-white text-red-500 shadow-md' : 'text-gray-400'}`}>Saída</button>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Descrição</label>
                <input required type="text" className="w-full text-2xl font-black border-b-4 border-blue-50 pb-2 outline-none focus:border-blue-600" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Aluguel, Salário..." />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-blue-600 block mb-2 tracking-widest">Valor Planejado</label>
                  <input required type="text" className="w-full text-3xl font-black border-b-4 border-blue-600 pb-2 outline-none" value={formData.plannedAmount === 0 ? '' : formData.plannedAmount} onChange={e => setFormData({...formData, plannedAmount: e.target.value as any})} placeholder="0,00" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Inicia em</label>
                  <input required type="month" className="w-full text-xl font-black border-b-4 border-blue-50 pb-2 outline-none" value={formData.competenceMonth} onChange={e => setFormData({...formData, competenceMonth: e.target.value})} />
                </div>
              </div>

              <div className="p-6 bg-blue-50 rounded-[2rem] border-2 border-blue-100 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RefreshCw size={20} className="text-blue-600" />
                    <span className="text-xs font-black uppercase text-gray-700">Repetir</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={formData.isFixed} onChange={e => setFormData({...formData, isFixed: e.target.checked})} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {formData.isFixed && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex flex-col gap-2">
                       <label className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${durationMode === 'infinite' ? 'bg-white border-blue-600 shadow-sm' : 'border-transparent opacity-60'}`}>
                          <input type="radio" className="hidden" name="dur" checked={durationMode === 'infinite'} onChange={() => setDurationMode('infinite')} />
                          <span className="text-[10px] font-black uppercase tracking-widest flex-1">Sem fim (Infinito)</span>
                       </label>
                       
                       <label className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${durationMode === 'fixed_months' ? 'bg-white border-blue-600 shadow-sm' : 'border-transparent opacity-60'}`}>
                          <input type="radio" className="hidden" name="dur" checked={durationMode === 'fixed_months'} onChange={() => setDurationMode('fixed_months')} />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest">Por X Meses</span>
                            {durationMode === 'fixed_months' && (
                              <input type="number" min="1" max="240" className="w-16 bg-blue-50 text-center font-black rounded-lg py-1" value={durationMonths} onChange={e => setDurationMonths(parseInt(e.target.value))} />
                            )}
                          </div>
                       </label>

                       <label className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${durationMode === 'until_date' ? 'bg-white border-blue-600 shadow-sm' : 'border-transparent opacity-60'}`}>
                          <input type="radio" className="hidden" name="dur" checked={durationMode === 'until_date'} onChange={() => setDurationMode('until_date')} />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest">Até o Mês</span>
                            {durationMode === 'until_date' && (
                              <input type="month" className="bg-blue-50 text-center font-black rounded-lg px-2 py-1 text-[10px]" value={formData.recurrence?.endMonth || ''} onChange={e => setFormData({...formData, recurrence: {...formData.recurrence!, endMonth: e.target.value}})} />
                            )}
                          </div>
                       </label>
                    </div>
                  </div>
                )}
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

              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-700 transition-all active:scale-95">
                {editingItem ? 'Confirmar Edição' : 'Salvar no Plano'}
              </button>
            </form>

            {/* Modal Modesto de Propagação */}
            {showPropagationModal && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6 rounded-[3rem] animate-in fade-in duration-300">
                <div className="w-full max-w-sm bg-white border-2 border-blue-100 rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center text-center space-y-6 animate-in zoom-in duration-300">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    {isProcessingPropagation ? <Loader2 className="animate-spin" size={24} /> : <History size={24} />}
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-black uppercase tracking-tight text-gray-900">Aplicar alteração</h4>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      Onde essa mudança deve valer?
                    </p>
                  </div>

                  <div className="w-full space-y-2">
                    <button 
                      disabled={isProcessingPropagation}
                      onClick={() => handlePropagationSelection('single')} 
                      className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col items-start hover:border-blue-300 hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <span className="font-black uppercase text-[10px] text-gray-800 leading-none mb-1">Só este mês</span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Ex.: Luz veio diferente</span>
                    </button>

                    <button 
                      disabled={isProcessingPropagation}
                      onClick={() => handlePropagationSelection('future')} 
                      className="w-full bg-blue-600 text-white p-4 rounded-2xl flex flex-col items-start hover:bg-blue-700 shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      <span className="font-black uppercase text-[10px] leading-none mb-1">Deste mês em diante</span>
                      <span className="text-[8px] font-bold text-blue-100 uppercase">Ex.: Salário aumentou</span>
                    </button>

                    <button 
                      disabled={isProcessingPropagation}
                      onClick={() => handlePropagationSelection('all')} 
                      className="w-full bg-white border-2 border-gray-100 p-4 rounded-2xl flex flex-col items-start hover:border-gray-300 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <span className="font-black uppercase text-[10px] text-gray-800 leading-none mb-1">Todos os meses</span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tight">Corrigir toda a série</span>
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

export default Provision;
