import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../App';
import { getTransactions, addTransaction, updateTransaction, getAccounts, deleteTransaction, getCategories } from '../services/db';
import { Transaction, Account, Category } from '../types';
import { formatCurrency, getCurrentMonth, getMonthName, getTodayDate, addMonthsToMonthKey } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { useToast } from '../context/ToastContext';
import { firebaseEnabled } from '../lib/firebase';
import { 
  CalendarRange, Plus, RefreshCw, X, Edit3, Trash2, History, Tags, ChevronLeft, ChevronRight, Calendar as CalendarIcon
} from 'lucide-react';
import { collection, serverTimestamp, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { getDb } from '../services/firestoreClient';
import BannerAd from '../components/BannerAd';
import CategorySelect from '../components/CategorySelect';

const Provision: React.FC = () => {
  const { user } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<Partial<Transaction>>({});

  const [durationMode, setDurationMode] = useState<'infinite' | 'fixed_months'>('infinite');
  const [durationMonths, setDurationMonths] = useState(12);
  const [showPropagationModal, setShowPropagationModal] = useState(false);
  const [isProcessingPropagation, setIsProcessingPropagation] = useState(false);

  const tableMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}`);
  }, [selectedYear]);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

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
    } finally {
      setLoading(false);
    }
  };

  const tableData = useMemo(() => {
    const plannedTxs = transactions.filter(t => (t.status === 'planned' || t.isFixed));
    
    const firstVisibleMonth = tableMonths[0];
    const pastTxs = plannedTxs.filter(t => t.competenceMonth < firstVisibleMonth);
    let initialAccumulated = pastTxs.reduce((acc, t) => {
      const val = parseNumericValue(t.plannedAmount || t.amount);
      return t.type === 'credit' ? acc + val : acc - val;
    }, 0);

    const buildGroupedData = (type: 'credit' | 'debit') => {
      const list = plannedTxs.filter(t => t.type === type);
      const catIds = Array.from(new Set(list.map(t => t.categoryId)));
      
      return catIds.map(catId => {
        const catName = categories.find(c => c.id === catId)?.name || 'Outros';
        const catItems = list.filter(t => t.categoryId === catId);
        const descriptions = Array.from(new Set(catItems.map(t => t.description)));
        
        const rows = descriptions.map(desc => {
          const values: Record<string, number> = {};
          tableMonths.forEach(m => {
            // Unifica valores caso a descrição se repita
            const items = catItems.filter(t => t.description === desc && t.competenceMonth === m);
            values[m] = items.reduce((sum, it) => sum + parseNumericValue(it.plannedAmount || it.amount), 0);
          });
          return { name: desc, values };
        }).filter(r => Object.values(r.values).some(v => v > 0));

        const catTotals: Record<string, number> = {};
        tableMonths.forEach(m => {
          catTotals[m] = rows.reduce((sum, r) => sum + r.values[m], 0);
        });

        return { catId, catName, rows, catTotals };
      }).filter(g => g.rows.length > 0);
    };

    const entryGroups = buildGroupedData('credit');
    const exitGroups = buildGroupedData('debit');

    const totalsEntry: Record<string, number> = {};
    const totalsExit: Record<string, number> = {};
    const netResult: Record<string, number> = {};
    const accumulated: Record<string, number> = {};

    let runningSum = initialAccumulated;
    tableMonths.forEach(m => {
      totalsEntry[m] = entryGroups.reduce((acc, g) => acc + g.catTotals[m], 0);
      totalsExit[m] = exitGroups.reduce((acc, g) => acc + g.catTotals[m], 0);
      netResult[m] = totalsEntry[m] - totalsExit[m];
      runningSum += netResult[m];
      accumulated[m] = runningSum;
    });

    return { entryGroups, exitGroups, totalsEntry, totalsExit, netResult, accumulated, initialAccumulated };
  }, [transactions, tableMonths, categories]);

  const handleOpenEdit = (description: string, type: 'credit' | 'debit') => {
    const item = transactions.find(t => t.description === description && t.type === type && (t.status === 'planned' || t.isFixed));
    if (item) {
      setEditingItem(item);
      setFormData(item);
      setDurationMode(item.recurrence.endMonth ? 'fixed_months' : 'infinite');
      setShowProvisionModal(true);
    }
  };

  const handleSaveProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.accountId || !formData.categoryId) return notifyInfo("Dados incompletos.");

    let finalEndMonth: string | null = null;
    if (durationMode === 'fixed_months') finalEndMonth = addMonthsToMonthKey(formData.competenceMonth!, durationMonths - 1);

    const updatedFormData = {
      ...formData,
      plannedAmount: parseNumericValue(formData.plannedAmount),
      recurrence: { ...formData.recurrence!, endMonth: finalEndMonth }
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
      const parentId = updatedFormData.isFixed ? crypto.randomUUID() : null;
      // Para previsões fixas, geramos até o fim da projeção de 35 anos se for infinito
      const count = updatedFormData.isFixed ? 420 : 1;
      for (let i = 0; i < count; i++) {
        const m = addMonthsToMonthKey(updatedFormData.competenceMonth!, i);
        if (finalEndMonth && m > finalEndMonth) break;
        if (m > '2060-12') break;
        
        await addTransaction({ 
          ...updatedFormData as Transaction, 
          userId: user.uid, 
          amount: 0, 
          status: 'planned', 
          competenceMonth: m, 
          recurrence: { ...updatedFormData.recurrence!, parentId } 
        });
      }
      notifySuccess("Previsão lançada com sucesso.");
      closeAllModals();
      loadData();
    }
  };

  const handlePropagationSelection = async (scope: 'single' | 'all' | 'future') => {
    if (!user || !editingItem || isProcessingPropagation) return;
    setIsProcessingPropagation(true);
    const updates = { 
      plannedAmount: parseNumericValue(formData.plannedAmount), 
      description: formData.description, 
      accountId: formData.accountId, 
      categoryId: formData.categoryId 
    };
    
    try {
      if (!firebaseEnabled) {
        const docs = JSON.parse(localStorage.getItem('azular_demo_transactions') || '[]');
        let updated = docs.map((d: any) => {
          const isSameSeries = d.recurrence?.parentId === editingItem.recurrence.parentId;
          if (scope === 'all' && isSameSeries) return {...d, ...updates};
          if (scope === 'future' && isSameSeries && d.competenceMonth >= editingItem.competenceMonth) return {...d, ...updates};
          if (scope === 'single' && d.id === editingItem.id) return {...d, ...updates};
          return d;
        });
        localStorage.setItem('azular_demo_transactions', JSON.stringify(updated));
      } else {
        const db = await getDb();
        const batch = writeBatch(db);
        const q = query(collection(db, 'transactions'), where('recurrence.parentId', '==', editingItem.recurrence.parentId), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
            const data = d.data();
            if (scope === 'all' || (scope === 'future' && data.competenceMonth >= editingItem.competenceMonth) || (scope === 'single' && d.id === editingItem.id)) {
                batch.update(d.ref, { ...updates, updatedAt: serverTimestamp() });
            }
        });
        await batch.commit();
      }
      notifySuccess("Série atualizada.");
      closeAllModals();
      loadData();
    } catch (e) { notifyError("Erro ao propagar."); }
    finally { setIsProcessingPropagation(false); }
  };

  const closeAllModals = () => { setShowProvisionModal(false); setShowPropagationModal(false); setEditingItem(null); setFormData({}); };

  const handleDeleteSeries = async (description: string, type: Transaction['type']) => {
    if (confirm(`Remover "${description}" de todos os meses?`)) {
        const items = transactions.filter(t => t.description === description && t.type === type && (t.status === 'planned' || t.isFixed));
        for (const it of items) await deleteTransaction(it.id!);
        notifySuccess("Removido.");
        loadData();
    }
  };

  return (
    <div className="space-y-6 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900 leading-none">Previsão</h2>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-2 flex items-center gap-2">
            <CalendarRange size={14} /> Ciclo de Vida (até 2060)
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-[1.5rem] shadow-sm border border-blue-50">
          <button onClick={() => setSelectedYear(y => Math.max(2024, y - 1))} className="p-2 hover:bg-blue-50 rounded-xl transition-all"><ChevronLeft size={20} /></button>
          <div className="flex items-center gap-2 px-4">
            <CalendarIcon size={16} className="text-blue-600" />
            <span className="text-sm font-black text-gray-900">{selectedYear}</span>
          </div>
          <button onClick={() => setSelectedYear(y => Math.min(2060, y + 1))} className="p-2 hover:bg-blue-50 rounded-xl transition-all"><ChevronRight size={20} /></button>
          <button onClick={() => { setFormData({ type: 'debit', competenceMonth: getCurrentMonth(), isFixed: true, recurrence: { enabled: true, frequency: 'monthly', interval: 1, startMonth: getCurrentMonth(), endMonth: null, parentId: null } }); setShowProvisionModal(true); }} className="ml-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md">+ Novo Plano</button>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-blue-50 dark:border-slate-800 shadow-xl overflow-hidden relative">
        <div className="overflow-x-auto no-scrollbar" ref={scrollContainerRef}>
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/50">
                <th className="sticky left-0 z-30 bg-gray-50 dark:bg-slate-800 px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-r border-blue-50 min-w-[280px]">DESCRITIVO</th>
                {tableMonths.map(m => (
                  <th key={m} className={`px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center border-b border-blue-50 ${m === getCurrentMonth() ? 'bg-blue-600 text-white shadow-inner' : 'text-gray-600 dark:text-gray-300'}`}>
                    {getMonthName(m).split(' de ')[0].toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              <tr className="bg-emerald-600 text-white font-black"><td className="sticky left-0 z-20 bg-emerald-600 px-6 py-2 text-[10px] uppercase tracking-[0.2em] border-r border-emerald-500">Fluxos de Entrada</td>{tableMonths.map(m => <td key={m} className="px-4 py-2 text-center text-[8px] opacity-60">PROJETADO</td>)}</tr>
              
              {tableData.entryGroups.map(group => (
                <React.Fragment key={group.catId}>
                  <tr className="bg-emerald-50/40"><td className="sticky left-0 z-20 bg-[#F4FCF9] dark:bg-slate-800 px-6 py-2 border-r border-emerald-100 flex items-center gap-2"><Tags size={12} className="text-emerald-500" /><span className="text-[9px] font-black text-emerald-700 uppercase">{group.catName}</span></td>{tableMonths.map(m => <td key={m} className="px-4 py-2 text-center text-[10px] font-black text-emerald-700">{formatCurrency(group.catTotals[m])}</td>)}</tr>
                  {group.rows.map(row => (
                    <tr key={row.name} className="group hover:bg-emerald-50/10 transition-colors">
                      <td className="sticky left-0 z-20 bg-white group-hover:bg-emerald-50/10 dark:bg-slate-900 px-10 py-3 border-r border-blue-50 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase">{row.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleOpenEdit(row.name, 'credit')} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit3 size={12} /></button><button onClick={() => handleDeleteSeries(row.name, 'credit')} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={12} /></button></div>
                      </td>
                      {tableMonths.map(m => <td key={m} className="px-4 py-3 text-center text-[10px] text-gray-400 font-medium">{row.values[m] > 0 ? formatCurrency(row.values[m]) : '-'}</td>)}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr className="bg-emerald-50 font-black"><td className="sticky left-0 z-20 bg-emerald-50 px-6 py-3 text-[9px] uppercase text-emerald-800 border-r border-blue-50">Total Entradas</td>{tableMonths.map(m => <td key={m} className="px-4 py-3 text-center text-xs text-emerald-800">{formatCurrency(tableData.totalsEntry[m])}</td>)}</tr>

              <tr className="bg-blue-600 text-white font-black"><td className="sticky left-0 z-20 bg-blue-600 px-6 py-2 text-[10px] uppercase tracking-[0.2em] border-r border-blue-500">Fluxos de Saída</td>{tableMonths.map(m => <td key={m} className="px-4 py-2 text-center text-[8px] opacity-60">PROJETADO</td>)}</tr>
              
              {tableData.exitGroups.map(group => (
                <React.Fragment key={group.catId}>
                  <tr className="bg-blue-50/40"><td className="sticky left-0 z-20 bg-[#F5F8FF] dark:bg-slate-800 px-6 py-2 border-r border-blue-100 flex items-center gap-2"><Tags size={12} className="text-blue-500" /><span className="text-[9px] font-black text-blue-700 uppercase">{group.catName}</span></td>{tableMonths.map(m => <td key={m} className="px-4 py-2 text-center text-[10px] font-black text-blue-700">{formatCurrency(group.catTotals[m])}</td>)}</tr>
                  {group.rows.map(row => (
                    <tr key={row.name} className="group hover:bg-blue-50/10 transition-colors">
                      <td className="sticky left-0 z-20 bg-white group-hover:bg-blue-50/10 dark:bg-slate-900 px-10 py-3 border-r border-blue-50 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase">{row.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleOpenEdit(row.name, 'debit')} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit3 size={12} /></button><button onClick={() => handleDeleteSeries(row.name, 'debit')} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={12} /></button></div>
                      </td>
                      {tableMonths.map(m => <td key={m} className="px-4 py-3 text-center text-[10px] text-gray-400 font-medium">{row.values[m] > 0 ? formatCurrency(row.values[m]) : '-'}</td>)}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
              <tr className="bg-blue-50 font-black"><td className="sticky left-0 z-20 bg-blue-50 px-6 py-3 text-[9px] uppercase text-blue-800 border-r border-blue-50">Total Saídas</td>{tableMonths.map(m => <td key={m} className="px-4 py-3 text-center text-xs text-blue-800">{formatCurrency(tableData.totalsExit[m])}</td>)}</tr>

              <tr className="bg-slate-900 text-white font-black">
                <td className="sticky left-0 z-20 bg-slate-900 px-6 py-5 text-[11px] uppercase tracking-widest border-r border-slate-700">Resultado do Mês</td>
                {tableMonths.map(m => <td key={m} className={`px-4 py-5 text-center text-sm ${tableData.netResult[m] >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(tableData.netResult[m])}</td>)}
              </tr>
              <tr className="bg-blue-800 text-white font-black">
                <td className="sticky left-0 z-20 bg-blue-800 px-6 py-5 text-[11px] uppercase tracking-widest border-r border-blue-700">Acumulado Histórico</td>
                {tableMonths.map(m => <td key={m} className="px-4 py-5 text-center text-sm">{formatCurrency(tableData.accumulated[m])}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <BannerAd />

      {showProvisionModal && (
        <div className="fixed inset-0 bg-blue-900/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-lg shadow-2xl p-10 max-h-[90vh] overflow-y-auto border-2 border-blue-50">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black uppercase tracking-tighter">Planejar Lançamento</h3><button onClick={closeAllModals}><X size={32} /></button></div>
            <form onSubmit={handleSaveProvision} className="space-y-6">
              <div className="flex p-2 bg-blue-50 rounded-[1.5rem]">
                <button type="button" onClick={() => setFormData({...formData, type: 'credit'})} className={`flex-1 py-3 font-black uppercase text-[10px] rounded-[1.2rem] transition-all ${formData.type === 'credit' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400'}`}>Entrada</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'debit'})} className={`flex-1 py-3 font-black uppercase text-[10px] rounded-[1.2rem] transition-all ${formData.type === 'debit' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}>Saída</button>
              </div>
              <div><label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Descrição</label><input required type="text" className="w-full text-2xl font-black border-b-4 border-blue-50 pb-2 outline-none focus:border-blue-600" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-8">
                <div><label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Valor Planejado</label><input required type="text" className="w-full text-3xl font-black border-b-4 border-blue-50 pb-2 outline-none focus:border-blue-600" value={formData.plannedAmount === 0 ? '' : (formData.plannedAmount || '')} onChange={e => setFormData({...formData, plannedAmount: e.target.value as any})} placeholder="0,00" /></div>
                <div><label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Mês de Início</label><input required type="month" className="w-full text-xl font-black border-b-4 border-blue-50 pb-2 outline-none" value={formData.competenceMonth || ''} onChange={e => setFormData({...formData, competenceMonth: e.target.value})} /></div>
              </div>
              <div className="p-6 bg-blue-50 rounded-[2rem] space-y-4">
                <div className="flex items-center justify-between"><div className="flex items-center gap-3"><RefreshCw size={20} className="text-blue-600" /><span className="text-xs font-black uppercase text-gray-700">Recorrente</span></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={formData.isFixed || false} onChange={e => setFormData({...formData, isFixed: e.target.checked})} /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div></label></div>
                {formData.isFixed && <div className="space-y-4 pt-4 border-t border-blue-100 flex flex-col gap-2">
                  <button type="button" onClick={() => setDurationMode('infinite')} className={`p-4 rounded-xl border-2 text-left transition-all ${durationMode === 'infinite' ? 'bg-white border-blue-600 shadow-sm' : 'border-transparent text-gray-400'}`}><span className="text-[10px] font-black uppercase tracking-widest">Até 2060 (Ciclo de Vida)</span></button>
                  <div className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${durationMode === 'fixed_months' ? 'bg-white border-blue-600 shadow-sm' : 'border-transparent text-gray-400'}`}><button type="button" onClick={() => setDurationMode('fixed_months')} className="text-[10px] font-black uppercase tracking-widest">Por número de meses</button>{durationMode === 'fixed_months' && <input type="number" className="w-16 bg-blue-50 text-center font-black rounded-lg py-1 outline-none" value={durationMonths} onChange={e => setDurationMonths(parseInt(e.target.value))} />}</div>
                </div>}
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div><label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Conta Principal</label><select required className="w-full font-black border-b-4 border-blue-50 bg-transparent outline-none" value={formData.accountId || ''} onChange={e => setFormData({...formData, accountId: e.target.value})}><option value="">Escolha</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                <CategorySelect userId={user!.uid} value={formData.categoryId || ''} direction={formData.type || 'debit'} onChange={(id) => setFormData({...formData, categoryId: id})} />
              </div>
              <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Salvar Plano</button>
            </form>
          </div>
        </div>
      )}

      {showPropagationModal && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md z-[120] flex items-center justify-center p-6"><div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-8 flex flex-col items-center text-center space-y-6"><div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><History size={24} /></div><div><h4 className="text-lg font-black uppercase">Atualizar Série</h4><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Essa mudança afeta outros meses. Qual o alcance?</p></div><div className="w-full space-y-2"><button onClick={() => handlePropagationSelection('single')} className="w-full bg-gray-50 p-4 rounded-2xl flex flex-col items-start"><span className="font-black uppercase text-[10px]">Só este mês</span></button><button onClick={() => handlePropagationSelection('future')} className="w-full bg-blue-600 text-white p-4 rounded-2xl flex flex-col items-start shadow-lg"><span className="font-black uppercase text-[10px]">Deste mês em diante</span></button><button onClick={() => handlePropagationSelection('all')} className="w-full bg-white border-2 border-gray-100 p-4 rounded-2xl flex flex-col items-start"><span className="font-black uppercase text-[10px]">Toda a série</span></button></div><button onClick={() => setShowPropagationModal(false)} className="text-[9px] font-black uppercase text-gray-300">Cancelar</button></div></div>
      )}
    </div>
  );
};

export default Provision;