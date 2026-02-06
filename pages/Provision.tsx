import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { getTransactions, addTransaction, updateTransaction, getAccounts, getCategories } from '../services/db';
import { Transaction, Account, Category } from '../types';
import { formatCurrency, getCurrentMonth, getMonthName } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { useToast } from '../context/ToastContext';
import { 
  ChevronLeft, ChevronRight, Loader2, AlertCircle, Plus, Info
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
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState<Partial<Transaction>>({});
  const [isSaving, setIsSaving] = useState(false);

  // UID seguro para evitar crashes
  const uid = user?.uid ?? null;

  const tableMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}`);
  }, [selectedYear]);

  useEffect(() => {
    loadData();
  }, [uid]); 

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
      console.error("Erro ao carregar provisões:", err);
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
          tableMonths.forEach(m => {
            const items = catItems.filter(t => t.description === desc && t.competenceMonth === m);
            values[m] = items.reduce((sum, it) => sum + parseNumericValue(it.plannedAmount || it.amount), 0);
          });
          return { name: desc, values };
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

  const handleSaveProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return notifyInfo("Faça login para salvar seus planos.");
    
    const amountVal = parseNumericValue(formData.plannedAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      notifyInfo("Informe um valor válido maior que zero.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        plannedAmount: amountVal,
        amount: 0, 
        userId: uid,
        status: 'planned' as const
      };

      if (editingItem?.id) {
        await updateTransaction(editingItem.id, payload);
      } else {
        await addTransaction(payload);
      }
      
      notifySuccess("Plano salvo!");
      setShowProvisionModal(false);
      loadData();
    } catch (err: any) {
      notifyError("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper para nome do mês abreviado em mobile
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
          <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-blue-50 rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-black text-gray-900">{selectedYear}</span>
          <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-blue-50 rounded-xl transition-colors">
            <ChevronRight size={20} />
          </button>
          
          <button 
            disabled={loading || !uid}
            onClick={() => { 
              setFormData({ type: 'debit', competenceMonth: getCurrentMonth() }); 
              setEditingItem(null);
              setShowProvisionModal(true); 
            }} 
            className={`ml-4 px-4 md:px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md flex items-center gap-2 transition-all ${
              !uid ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white active:scale-95'
            }`}
          >
            <Plus size={14} /> <span className="hidden xs:inline">Novo Plano</span>
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border-2 border-blue-50 shadow-xl overflow-hidden relative">
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
                  <th className="sticky left-0 z-30 bg-gray-100 px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black uppercase text-gray-500 tracking-widest border-r border-blue-50 w-[120px] md:w-[280px]">DESCRITIVO</th>
                  {tableMonths.map(m => (
                    <th key={m} className={`px-2 md:px-4 py-4 md:py-5 text-[9px] md:text-[10px] font-black uppercase text-center border-b border-blue-50 ${m === getCurrentMonth() ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
                      <span className="md:hidden">{getShortMonth(m)}</span>
                      <span className="hidden md:inline">{getMonthName(m).split(' de ')[0].toUpperCase()}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {/* Seção Ganhos */}
                 <tr className="bg-emerald-600 text-white font-black">
                   <td className="sticky left-0 bg-emerald-600 px-4 md:px-6 py-2 text-[9px] md:text-[10px] uppercase border-r border-emerald-500 z-20">Ganhos Planejados</td>
                   {tableMonths.map(m => <td key={m} className="px-4 py-2" />)}
                 </tr>
                 {tableData.entryGroups.length === 0 ? (
                   <tr>
                     <td className="sticky left-0 bg-white px-4 md:px-6 py-3 text-[9px] md:text-[10px] font-bold text-gray-300 italic z-20">Sem entradas previstas</td>
                     {tableMonths.map(m => <td key={m} className="px-4 py-2" />)}
                   </tr>
                 ) : tableData.entryGroups.map(g => (
                    <React.Fragment key={g.catId}>
                      <tr className="bg-emerald-50/50">
                        <td className="sticky left-0 bg-[#F4FCF9] px-4 md:px-6 py-2 border-r border-emerald-100 text-[8px] md:text-[9px] font-black text-emerald-700 uppercase z-20">{g.catName}</td>
                        {tableMonths.map(m => <td key={m} className="px-2 md:px-4 py-2 text-center text-[9px] md:text-[10px] font-black text-emerald-800">{formatCurrency(g.catTotals[m])}</td>)}
                      </tr>
                      {g.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="sticky left-0 bg-white px-8 md:px-10 py-1.5 border-r border-gray-100 text-[8px] md:text-[9px] font-bold text-gray-500 uppercase z-20 truncate">{row.name}</td>
                          {tableMonths.map(m => <td key={m} className="px-2 md:px-4 py-1.5 text-center text-[8px] md:text-[9px] font-medium text-gray-400">{row.values[m] > 0 ? formatCurrency(row.values[m]) : '-'}</td>)}
                        </tr>
                      ))}
                    </React.Fragment>
                 ))}
                 
                 {/* Seção Gastos */}
                 <tr className="bg-blue-600 text-white font-black">
                   <td className="sticky left-0 bg-blue-600 px-4 md:px-6 py-2 text-[9px] md:text-[10px] uppercase border-r border-blue-500 z-20">Gastos Planejados</td>
                   {tableMonths.map(m => <td key={m} className="px-4 py-2" />)}
                 </tr>
                 {tableData.exitGroups.length === 0 ? (
                   <tr>
                     <td className="sticky left-0 bg-white px-4 md:px-6 py-3 text-[9px] md:text-[10px] font-bold text-gray-300 italic z-20">Sem gastos previstos</td>
                     {tableMonths.map(m => <td key={m} className="px-4 py-2" />)}
                   </tr>
                 ) : tableData.exitGroups.map(g => (
                    <React.Fragment key={g.catId}>
                      <tr className="bg-blue-50/50">
                        <td className="sticky left-0 bg-[#F5F8FF] px-4 md:px-6 py-2 border-r border-blue-100 text-[8px] md:text-[9px] font-black text-blue-700 uppercase z-20">{g.catName}</td>
                        {tableMonths.map(m => <td key={m} className="px-2 md:px-4 py-2 text-center text-[9px] md:text-[10px] font-black text-blue-800">{formatCurrency(g.catTotals[m])}</td>)}
                      </tr>
                      {g.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="sticky left-0 bg-white px-8 md:px-10 py-1.5 border-r border-gray-100 text-[8px] md:text-[9px] font-bold text-gray-500 uppercase z-20 truncate">{row.name}</td>
                          {tableMonths.map(m => <td key={m} className="px-2 md:px-4 py-1.5 text-center text-[8px] md:text-[9px] font-medium text-gray-400">{row.values[m] > 0 ? formatCurrency(row.values[m]) : '-'}</td>)}
                        </tr>
                      ))}
                    </React.Fragment>
                 ))}
                 
                 {/* Acumulado */}
                 <tr className="bg-slate-900 text-white font-black">
                   <td className="sticky left-0 bg-slate-900 px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-[11px] uppercase border-r border-slate-700 z-20">Acumulado Previsto</td>
                   {tableMonths.map(m => (
                     <td key={m} className={`px-2 md:px-4 py-4 md:py-5 text-center text-[10px] md:text-sm font-black ${tableData.accumulated[m] < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                       {formatCurrency(tableData.accumulated[m])}
                     </td>
                   ))}
                 </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest px-2">
        <Info size={12} className="text-blue-500" /> Arraste para os lados para ver os meses seguintes.
      </div>

      {showProvisionModal && (
        <div className="fixed inset-0 bg-blue-900/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] w-full max-w-lg shadow-2xl p-6 md:p-10 relative border-2 border-blue-50 animate-in zoom-in duration-300">
            <h3 className="text-xl md:text-2xl font-black uppercase tracking-tighter mb-8 text-center md:text-left">Planejamento Mensal</h3>
            
            {!uid ? (
              <div className="text-center py-10 space-y-4">
                <AlertCircle className="text-amber-500 mx-auto mb-2" size={32} />
                <p className="text-[10px] font-black uppercase text-amber-800 tracking-widest leading-relaxed">
                  Modo demonstração habilitado.<br/>Entre para salvar.
                </p>
                <button type="button" onClick={() => setShowProvisionModal(false)} className="w-full py-4 text-gray-400 font-black uppercase text-[10px]">Fechar</button>
              </div>
            ) : (
              <form onSubmit={handleSaveProvision} className="space-y-6">
                <div className="flex p-2 bg-blue-50 rounded-[1.5rem]">
                  <button type="button" onClick={() => setFormData({...formData, type: 'credit'})} className={`flex-1 py-3 font-black uppercase text-[10px] rounded-[1.2rem] transition-all ${formData.type === 'credit' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400'}`}>Entrada</button>
                  <button type="button" onClick={() => setFormData({...formData, type: 'debit'})} className={`flex-1 py-3 font-black uppercase text-[10px] rounded-[1.2rem] transition-all ${formData.type === 'debit' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400'}`}>Saída</button>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block tracking-widest">Descrição</label>
                  <input required type="text" className="w-full text-xl md:text-2xl font-black border-b-4 border-blue-50 pb-2 outline-none focus:border-blue-600 transition-colors bg-transparent" placeholder="Ex: Aluguel, Salário..." value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-8">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block tracking-widest">Valor</label>
                    <input required type="text" className="w-full text-2xl md:text-3xl font-black border-b-4 border-blue-50 pb-2 outline-none focus:border-blue-600 bg-transparent" placeholder="0,00" value={formData.plannedAmount || ''} onChange={e => setFormData({...formData, plannedAmount: e.target.value as any})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block tracking-widest">Mês Alvo</label>
                    <input required type="month" className="w-full text-lg md:text-xl font-black border-b-4 border-blue-50 pb-2 outline-none bg-transparent" value={formData.competenceMonth || ''} onChange={e => setFormData({...formData, competenceMonth: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 block tracking-widest">Conta Destino</label>
                    <select required className="w-full font-black border-b-4 border-blue-50 bg-transparent outline-none pb-2" value={formData.accountId || ''} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                      <option value="">Selecione...</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <CategorySelect userId={uid} value={formData.categoryId || ''} direction={formData.type || 'debit'} onChange={(id) => setFormData({...formData, categoryId: id})} />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowProvisionModal(false)} className="flex-1 py-4 font-black uppercase text-[10px] text-gray-400 tracking-widest">Sair</button>
                  <button disabled={isSaving} type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg disabled:opacity-50 active:scale-95 transition-all">
                    {isSaving ? 'Salvando...' : 'Salvar Plano'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Provision;