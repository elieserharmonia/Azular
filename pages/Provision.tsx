
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { 
  getTransactions, 
  addTransaction, 
  updateTransaction, 
  getAccounts, 
  getCategories, 
  addProvisionSeries,
  updateProvisionSeries,
  deleteProvisionSeries
} from '../services/db';
import { Transaction, Account, Category } from '../types';
import { formatCurrency, getCurrentMonth, getMonthName } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { useToast } from '../context/ToastContext';
import { 
  ChevronLeft, ChevronRight, Loader2, Plus, Repeat, Trash2, X
} from 'lucide-react';
import CategorySelect from '../components/CategorySelect';

const Provision: React.FC = () => {
  const { user } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<Partial<Transaction>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [scopeAction, setScopeAction] = useState<'update' | 'delete'>('update');

  // Intervalo customizado para exclusão
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [showRangeInputs, setShowRangeInputs] = useState(false);

  const uid = user?.uid ?? null;

  const tableMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}`);
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [uid, selectedYear]); 

  const loadData = async () => {
    if (!uid) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const [txs, accs, cats] = await Promise.all([
        getTransactions(uid).catch(() => []), 
        getAccounts(uid).catch(() => []),
        getCategories(uid).catch(() => [])
      ]);
      
      setTransactions(txs || []);
      setAccounts(accs || []);
      setCategories(cats || []);
    } catch (err) {
      notifyError("Não foi possível carregar os dados financeiros.");
    } finally {
      setLoading(false);
    }
  };

  const tableData = useMemo(() => {
    const plannedTxs = transactions.filter(t => (t.status === 'planned' || t.isFixed));
    
    const buildGroupedData = (list: Transaction[], type: 'credit' | 'debit') => {
      const filtered = list.filter(t => t.type === type);
      const catIds = Array.from(new Set(filtered.map(t => t.categoryId)));
      
      return catIds.map(catId => {
        const catName = categories.find(c => c.id === catId)?.name || 'Outros';
        const catItems = filtered.filter(t => t.categoryId === catId);
        const descriptions = Array.from(new Set(catItems.map(t => t.description)));
        
        const rows = descriptions.map(desc => {
          const values: Record<string, number> = {};
          const originals: Record<string, Transaction | null> = {};
          
          tableMonths.forEach(m => {
            const items = catItems.filter(t => t.description === desc && t.competenceMonth === m);
            values[m] = items.reduce((sum, it) => sum + parseNumericValue(it.plannedAmount || it.amount), 0);
            originals[m] = items[0] || null;
          });
          return { name: desc, values, originals };
        });

        const catTotals: Record<string, number> = {};
        tableMonths.forEach(m => {
          catTotals[m] = rows.reduce((sum, r) => sum + r.values[m], 0);
        });

        return { catId, catName, rows, catTotals };
      }).filter(g => g.rows.some(r => Object.values(r.values).some(v => v > 0)));
    };

    const entryGroups = buildGroupedData(plannedTxs, 'credit');
    const exitGroups = buildGroupedData(plannedTxs, 'debit');

    const accumulated: Record<string, number> = {};
    let running = 0;
    tableMonths.forEach(m => {
      const inM = entryGroups.reduce((acc, g) => acc + g.catTotals[m], 0);
      const outM = exitGroups.reduce((acc, g) => acc + g.catTotals[m], 0);
      running += (inM - outM);
      accumulated[m] = running;
    });

    return { entryGroups, exitGroups, accumulated };
  }, [transactions, tableMonths, categories]);

  const handleOpenEdit = (tx: Transaction) => {
    setEditingItem(tx);
    setFormData({
      ...tx,
      plannedAmount: parseNumericValue(tx.plannedAmount || tx.amount) as any
    });
    setShowRangeInputs(false);
    setShowProvisionModal(true);
  };

  const confirmAction = async (scope: 'current' | 'forward' | 'all' | 'range') => {
    if (!uid) return;
    setIsSaving(true);
    
    try {
      if (scopeAction === 'update') {
        const amountVal = parseNumericValue(formData.plannedAmount);
        const payload = { ...formData, plannedAmount: amountVal, userId: uid, updatedAt: new Date().toISOString() };
        
        if (editingItem?.recurrenceGroupId) {
          await updateProvisionSeries(editingItem, payload, scope === 'range' ? 'all' : scope);
        } else if (editingItem?.id) {
          await updateTransaction(editingItem.id, payload);
        }
        notifySuccess("Alteração aplicada!");
      } else {
        // EXCLUSÃO
        await deleteProvisionSeries(
          editingItem!, 
          scope, 
          scope === 'range' ? { from: rangeStart, to: rangeEnd } : undefined
        );
        notifySuccess("Exclusão concluída!");
      }
      
      setShowProvisionModal(false);
      setShowScopeModal(false);
      loadData();
    } catch (err) {
      notifyError("Erro ao processar sua solicitação.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    
    const amountVal = parseNumericValue(formData.plannedAmount);
    if (isNaN(amountVal) || amountVal <= 0) return notifyInfo("Informe um valor válido.");

    if (editingItem?.recurrenceGroupId) {
      setScopeAction('update');
      setShowScopeModal(true);
    } else {
      confirmAction('current');
    }
  };

  const getShortMonth = (m: string) => {
    const full = getMonthName(m).split(' de ')[0].toUpperCase();
    return full.length > 3 ? full.substring(0, 3) : full;
  };

  return (
    <div className="space-y-6 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900 leading-none">Previsão</h2>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-[1.5rem] shadow-sm border border-blue-50">
          <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-blue-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
          <span className="text-sm font-black text-gray-900">{selectedYear}</span>
          <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-blue-50 rounded-xl transition-colors"><ChevronRight size={20} /></button>
          
          <button 
            disabled={loading || !uid}
            onClick={() => { 
              setFormData({ type: 'debit', competenceMonth: getCurrentMonth(), isRecurring: false, recurrenceMode: 'none' }); 
              setEditingItem(null);
              setShowProvisionModal(true); 
            }} 
            className="ml-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md flex items-center gap-2"
          >
            <Plus size={14} /> Novo Plano
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[2rem] border-2 border-blue-50 shadow-xl overflow-hidden relative">
        <div className="overflow-x-auto no-scrollbar scroll-smooth">
          {loading ? (
             <div className="p-20 text-center flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-blue-600" />
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Calculando projeções...</span>
             </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px] md:min-w-[1200px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-30 bg-gray-100 px-2 md:px-4 py-4 text-[8px] md:text-[10px] font-black uppercase text-gray-500 tracking-widest border-r border-blue-50 w-[90px] md:w-[280px]">DESCRITIVO</th>
                  {tableMonths.map(m => (
                    <th key={m} className={`px-2 py-4 text-[9px] md:text-[10px] font-black uppercase text-center border-b border-blue-50 ${m === getCurrentMonth() ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
                      <span className="md:hidden">{getShortMonth(m)}</span>
                      <span className="hidden md:inline">{getMonthName(m).split(' de ')[0].toUpperCase()}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {/* Ganhos */}
                 <tr className="bg-emerald-600 text-white font-black">
                   <td className="sticky left-0 bg-emerald-600 px-2 md:px-4 py-2 text-[8px] md:text-[10px] uppercase border-r border-emerald-500 z-20">Ganhos Planejados</td>
                   {tableMonths.map(m => <td key={m} className="px-4 py-2" />)}
                 </tr>
                 {tableData.entryGroups.map(g => (
                    <React.Fragment key={g.catId}>
                      <tr className="bg-emerald-50/30">
                        <td className="sticky left-0 bg-[#F4FCF9] px-2 md:px-4 py-2 border-r border-emerald-100 text-[7px] md:text-[9px] font-black text-emerald-700 uppercase z-20 truncate">{g.catName}</td>
                        {tableMonths.map(m => <td key={m} className="px-2 py-2 text-center text-[8px] md:text-[10px] font-black text-emerald-800">{formatCurrency(g.catTotals[m])}</td>)}
                      </tr>
                      {g.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                          <td className="sticky left-0 bg-white px-4 md:px-8 py-2 border-r border-gray-100 text-[7px] md:text-[8px] font-bold text-gray-500 uppercase z-20 truncate">{row.name}</td>
                          {tableMonths.map(m => (
                            <td key={m} onClick={() => row.originals[m] && handleOpenEdit(row.originals[m]!)} className={`px-2 py-2 text-center text-[7px] md:text-[9px] font-medium cursor-pointer ${row.values[m] > 0 ? 'text-gray-600 hover:scale-110' : 'text-gray-200'}`}>
                              <div className="flex flex-col items-center gap-0.5">
                                {row.values[m] > 0 ? formatCurrency(row.values[m]) : '-'}
                                {row.originals[m]?.recurrenceGroupId && <Repeat size={8} className="text-blue-400" />}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                 ))}
                 
                 {/* Gastos */}
                 <tr className="bg-blue-600 text-white font-black">
                   <td className="sticky left-0 bg-blue-600 px-2 md:px-4 py-2 text-[8px] md:text-[10px] uppercase border-r border-blue-500 z-20">Gastos Planejados</td>
                   {tableMonths.map(m => <td key={m} className="px-4 py-2" />)}
                 </tr>
                 {tableData.exitGroups.map(g => (
                    <React.Fragment key={g.catId}>
                      <tr className="bg-blue-50/30">
                        <td className="sticky left-0 bg-[#F5F8FF] px-2 md:px-4 py-2 border-r border-blue-100 text-[7px] md:text-[9px] font-black text-blue-700 uppercase z-20 truncate">{g.catName}</td>
                        {tableMonths.map(m => <td key={m} className="px-2 py-2 text-center text-[8px] md:text-[10px] font-black text-blue-800">{formatCurrency(g.catTotals[m])}</td>)}
                      </tr>
                      {g.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                          <td className="sticky left-0 bg-white px-4 md:px-8 py-2 border-r border-gray-100 text-[7px] md:text-[8px] font-bold text-gray-500 uppercase z-20 truncate">{row.name}</td>
                          {tableMonths.map(m => (
                            <td key={m} onClick={() => row.originals[m] && handleOpenEdit(row.originals[m]!)} className={`px-2 py-2 text-center text-[7px] md:text-[9px] font-medium cursor-pointer ${row.values[m] > 0 ? 'text-gray-600 hover:scale-110' : 'text-gray-200'}`}>
                              <div className="flex flex-col items-center gap-0.5">
                                {row.values[m] > 0 ? formatCurrency(row.values[m]) : '-'}
                                {row.originals[m]?.recurrenceGroupId && <Repeat size={8} className="text-blue-400" />}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </React.Fragment>
                 ))}
                 
                 {/* Acumulado */}
                 <tr className="bg-slate-900 text-white font-black">
                   <td className="sticky left-0 bg-slate-900 px-2 md:px-4 py-4 text-[8px] md:text-[11px] uppercase border-r border-slate-700 z-20">Acumulado Previsto</td>
                   {tableMonths.map(m => (
                     <td key={m} className={`px-2 py-4 text-center text-[8px] md:text-sm font-black ${tableData.accumulated[m] < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                       {formatCurrency(tableData.accumulated[m])}
                     </td>
                   ))}
                 </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Previsão */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8 relative border-2 border-blue-50 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-tighter">{editingItem ? 'Editar Plano' : 'Novo Plano'}</h3>
              <button onClick={() => setShowProvisionModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveProvision} className="space-y-6">
              <div className="flex p-1.5 bg-blue-50 rounded-2xl">
                <button type="button" onClick={() => setFormData({...formData, type: 'credit'})} className={`flex-1 py-3 font-black uppercase text-[10px] rounded-xl ${formData.type === 'credit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Entrada</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'debit'})} className={`flex-1 py-3 font-black uppercase text-[10px] rounded-xl ${formData.type === 'debit' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Saída</button>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Descrição</label>
                <input required type="text" className="w-full text-xl font-black border-b-2 border-blue-50 pb-2 outline-none focus:border-blue-600 bg-transparent" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Valor</label>
                  <input required type="text" className="w-full text-2xl font-black border-b-2 border-blue-50 pb-2 outline-none focus:border-blue-600 bg-transparent" placeholder="0,00" value={formData.plannedAmount || ''} onChange={e => setFormData({...formData, plannedAmount: e.target.value as any})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Mês Alvo</label>
                  <input required type="month" className="w-full text-xl font-black border-b-2 border-blue-50 pb-2 outline-none bg-transparent" value={formData.competenceMonth || ''} onChange={e => setFormData({...formData, competenceMonth: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <select required className="w-full font-black border-b-2 border-blue-50 bg-transparent outline-none pb-2" value={formData.accountId || ''} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                  <option value="">Conta...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <CategorySelect userId={uid!} value={formData.categoryId || ''} direction={formData.type || 'debit'} onChange={(id) => setFormData({...formData, categoryId: id})} />
              </div>

              {!editingItem && (
                <div className="p-5 bg-gray-50 rounded-3xl border-2 border-gray-100 space-y-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${formData.isRecurring ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}><Repeat size={16} /></div>
                      <span className="text-[10px] font-black uppercase text-gray-600">Repetir todo mês?</span>
                    </div>
                    <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={formData.isRecurring} onChange={e => setFormData({...formData, isRecurring: e.target.checked, recurrenceMode: e.target.checked ? 'until' : 'none'})} />
                  </label>
                  {formData.isRecurring && (
                    <div className="space-y-4 pt-2 border-t border-gray-200">
                       <div className="flex gap-2">
                         <button type="button" onClick={() => setFormData({...formData, recurrenceMode: 'until'})} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg border-2 ${formData.recurrenceMode === 'until' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'}`}>Até o Mês</button>
                         <button type="button" onClick={() => setFormData({...formData, recurrenceMode: 'count'})} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg border-2 ${formData.recurrenceMode === 'count' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'}`}>Por X meses</button>
                       </div>
                       {formData.recurrenceMode === 'until' && <input type="month" className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl font-black text-xs" value={formData.recurrenceEndMonth || ''} onChange={e => setFormData({...formData, recurrenceEndMonth: e.target.value})} />}
                       {formData.recurrenceMode === 'count' && <input type="number" className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl font-black text-xs" placeholder="Meses" value={formData.recurrenceCount || ''} onChange={e => setFormData({...formData, recurrenceCount: parseInt(e.target.value)})} />}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                {editingItem && (
                  <button type="button" onClick={() => { setScopeAction('delete'); setShowScopeModal(true); }} className="flex-1 py-4 text-red-500 font-black uppercase text-[10px] hover:bg-red-50 rounded-2xl flex items-center justify-center gap-2">
                    <Trash2 size={16} /> Excluir
                  </button>
                )}
                <button disabled={isSaving} type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">
                  {isSaving ? 'Salvando...' : 'Salvar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Alcance (Scope) - Corrigido para Excluir em Série */}
      {showScopeModal && (
        <div className="fixed inset-0 bg-blue-900/60 backdrop-blur-xl z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-sm shadow-2xl p-10 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-4"><Repeat size={32} /></div>
              <h4 className="text-xl font-black uppercase tracking-tighter">{scopeAction === 'update' ? 'Atualizar Série' : 'Excluir Série'}</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Escolha o alcance da operação.</p>
            </div>

            <div className="space-y-3">
              <button onClick={() => confirmAction('current')} className="w-full py-4 px-6 bg-gray-50 hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-600 rounded-2xl text-[10px] font-black uppercase text-gray-600 flex items-center justify-between group transition-all">
                Somente este mês
              </button>
              <button onClick={() => confirmAction('forward')} className="w-full py-4 px-6 bg-gray-50 hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-600 rounded-2xl text-[10px] font-black uppercase text-gray-600 flex items-center justify-between group transition-all">
                Deste mês em diante
              </button>
              <button onClick={() => confirmAction('all')} className="w-full py-4 px-6 bg-gray-50 hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-600 rounded-2xl text-[10px] font-black uppercase text-gray-600 flex items-center justify-between group transition-all">
                Toda a série
              </button>
              
              {/* Opção de Intervalo Customizado */}
              <button onClick={() => setShowRangeInputs(!showRangeInputs)} className="w-full py-4 px-6 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[10px] font-black uppercase text-gray-400 flex items-center justify-between">
                Escolher Intervalo...
              </button>

              {showRangeInputs && (
                <div className="p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 space-y-4 animate-in slide-in-from-top-2">
                   <div className="grid grid-cols-2 gap-2">
                     <input type="month" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="w-full p-2 text-[10px] font-black uppercase border rounded-lg" placeholder="Início" />
                     <input type="month" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="w-full p-2 text-[10px] font-black uppercase border rounded-lg" placeholder="Fim" />
                   </div>
                   <button 
                    disabled={!rangeStart || !rangeEnd}
                    onClick={() => confirmAction('range')}
                    className="w-full py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-30"
                   >Confirmar Intervalo</button>
                </div>
              )}
            </div>

            <div className="pt-4 text-center">
              <button onClick={() => setShowScopeModal(false)} className="text-[10px] font-black uppercase text-gray-300">Voltar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Provision;
