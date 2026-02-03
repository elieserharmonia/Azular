
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { getTransactions, addTransaction, getAccounts, getCategories } from '../services/db';
import { Transaction, Account, Category } from '../types';
import { formatCurrency, getCurrentMonth, getMonthName, getTodayDate } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Line, Bar
} from 'recharts';
import { 
  TrendingUp, Info, Waves, Target, CheckCircle, ChevronDown, Calendar, Plus, RefreshCw, AlertCircle, X
} from 'lucide-react';
import ChartShell from '../components/ChartShell';
import SimpleBars from '../components/SimpleBars';

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
    endDate: null,
    occurrences: 1,
    parentId: null
  }
});

const Provision: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(12);
  const [loading, setLoading] = useState(true);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>(INITIAL_PROVISION_STATE());

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

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

  const provisionedItems = useMemo(() => {
    return transactions.filter(t => t.status === 'planned' || t.isFixed);
  }, [transactions]);

  const projectionData = useMemo(() => {
    if (loading) return [];
    const months: Record<string, { name: string, plannedIncome: number, realIncome: number, plannedExpense: number, realExpense: number, key: string }> = {};
    const now = new Date();
    const currentMonthKey = getCurrentMonth();
    const pastOffset = Math.floor(selectedPeriod / 2);
    const futureOffset = selectedPeriod - pastOffset - 1;

    for (let i = -pastOffset; i <= futureOffset; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { 
        name: getMonthName(key).split(' de ')[0], 
        plannedIncome: 0, 
        realIncome: 0, 
        plannedExpense: 0, 
        realExpense: 0,
        key
      };
    }

    transactions.forEach(t => {
      const m = t.competenceMonth;
      if (months[m]) {
        const plannedVal = parseNumericValue(t.plannedAmount || t.amount);
        const realVal = parseNumericValue(t.amount);
        if (t.type === 'credit') {
          months[m].plannedIncome += plannedVal;
          if (t.status === 'done') months[m].realIncome += realVal;
        } else {
          months[m].plannedExpense += plannedVal;
          if (t.status === 'done') months[m].realExpense += realVal;
        }
      }
    });

    const sorted = Object.values(months).sort((a, b) => a.key.localeCompare(b.key));
    let accPlanned = 0;
    let accReal = 0;
    return sorted.map(m => {
      accPlanned += (m.plannedIncome - m.plannedExpense);
      let currentAccReal: number | null = null;
      if (m.key <= currentMonthKey) {
        accReal += (m.realIncome - m.realExpense);
        currentAccReal = accReal;
      }
      return { ...m, accPlanned, accReal: currentAccReal };
    });
  }, [transactions, selectedPeriod, loading]);

  const currentMonthData = useMemo(() => {
    const key = getCurrentMonth();
    return projectionData.find(m => m.key === key);
  }, [projectionData]);

  const handleSaveProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.accountId || !formData.categoryId) {
      alert("Preencha todos os campos.");
      return;
    }

    try {
      await addTransaction({
        ...formData as Transaction,
        userId: user.uid,
        plannedAmount: parseNumericValue(formData.plannedAmount),
        amount: 0,
        status: 'planned'
      });
      setShowProvisionModal(false);
      setFormData(INITIAL_PROVISION_STATE());
      loadData();
    } catch (err) {
      alert("Erro ao salvar provisão.");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 font-black uppercase text-blue-600 text-[10px] tracking-widest">Azulando sua visão de futuro...</p>
    </div>
  );

  return (
    <div className="space-y-10 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">Provisão</h2>
          <p className="text-blue-500 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
            <Waves size={14} /> Gestão do seu Plano de Vida
          </p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setSelectedPeriod(selectedPeriod === 6 ? 12 : 6)}
            className="bg-white border-2 border-blue-50 px-6 py-3 rounded-[1.5rem] flex items-center gap-3 shadow-sm hover:border-blue-600 transition-all active:scale-95"
          >
            <Calendar size={18} className="text-blue-600" />
            <span className="text-[10px] font-black uppercase text-gray-700">Período: {selectedPeriod}M</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
             <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
             <div className="flex items-center gap-3 opacity-60 mb-4">
               <Target size={20} />
               <span className="text-[10px] font-black uppercase tracking-widest">Gap Planejado (Mês)</span>
             </div>
             <div className="text-4xl font-black tracking-tighter">
               {formatCurrency((currentMonthData?.plannedIncome || 0) - (currentMonthData?.plannedExpense || 0))}
             </div>
             <p className="text-[10px] font-black mt-3 opacity-60 uppercase">Diferença entre ganhos e custos fixos</p>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-50 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-black uppercase text-xs text-gray-900 flex items-center gap-2">
                <RefreshCw size={16} className="text-blue-600" /> Itens Provisionados
              </h3>
              <button 
                onClick={() => setShowProvisionModal(true)}
                className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
              >
                + Adicionar
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 no-scrollbar">
              {provisionedItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-100 transition-all">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-gray-800 leading-none">{item.description}</span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">Recorrente • {item.competenceMonth}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-gray-900">{formatCurrency(item.plannedAmount)}</div>
                    <div className={`text-[8px] font-black uppercase ${item.type === 'credit' ? 'text-emerald-500' : 'text-red-400'}`}>
                      {item.type === 'credit' ? 'Entrada' : 'Saída'}
                    </div>
                  </div>
                </div>
              ))}
              {provisionedItems.length === 0 && (
                <div className="text-center py-10">
                  <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-[10px] font-black uppercase text-gray-400">Nenhum item fixo provisionado.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <ChartShell 
            title="Evolução do Plano (Previsto)" 
            hasData={projectionData.length > 0} 
            heightClass="h-[450px]"
            fallback={<SimpleBars data={projectionData} />}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={projectionData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f7ff" />
                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} 
                  formatter={(value: any) => value !== null ? formatCurrency(parseNumericValue(value)) : '---'}
                />
                <Legend verticalAlign="top" iconType="circle" />
                
                <Bar dataKey="plannedIncome" name="Ganhos Previstos" fill="#bfdbfe" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="plannedExpense" name="Gastos Previstos" fill="#fecaca" radius={[4, 4, 0, 0]} barSize={12} />
                
                <Line type="monotone" dataKey="accPlanned" name="Acumulado Plano" stroke="#2563eb" strokeWidth={3} strokeDasharray="5 5" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartShell>
        </div>
      </div>

      {showProvisionModal && (
        <div className="fixed inset-0 bg-blue-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Provisão de Plano</h3>
              <button onClick={() => setShowProvisionModal(false)}><X size={32} /></button>
            </div>

            <form onSubmit={handleSaveProvision} className="space-y-8">
              <div className="flex p-2 bg-blue-50 rounded-[1.5rem]">
                <button type="button" onClick={() => setFormData({...formData, type: 'credit'})} className={`flex-1 py-4 font-black uppercase rounded-[1.2rem] transition-all ${formData.type === 'credit' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400'}`}>Entrada Fixa</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'debit'})} className={`flex-1 py-4 font-black uppercase rounded-[1.2rem] transition-all ${formData.type === 'debit' ? 'bg-white text-red-500 shadow-md' : 'text-gray-400'}`}>Gasto Fixo</button>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Nome do Item</label>
                <input required type="text" className="w-full text-2xl font-black border-b-4 border-blue-50 pb-2 outline-none focus:border-blue-600" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Ex: Aluguel, Salário..." />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                   <label className="text-[10px] font-black uppercase text-blue-600 block mb-2 tracking-widest">Valor Planejado</label>
                   <input required type="text" className="w-full text-3xl font-black border-b-4 border-blue-600 pb-2 outline-none" value={formData.plannedAmount === 0 ? '' : formData.plannedAmount} onChange={e => setFormData({...formData, plannedAmount: e.target.value as any})} placeholder="0,00" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Mês de Início</label>
                  <input required type="month" className="w-full text-xl font-black border-b-4 border-blue-50 pb-2 outline-none" value={formData.competenceMonth} onChange={e => setFormData({...formData, competenceMonth: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Conta Sugerida</label>
                  <select required className="w-full font-black border-b-4 border-blue-50 pb-2 bg-transparent outline-none" value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                    <option value="">Selecione</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Categoria</label>
                  <select required className="w-full font-black border-b-4 border-blue-50 pb-2 bg-transparent outline-none" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                    <option value="">Escolha</option>
                    {categories.filter(c => c.direction === formData.type || c.direction === 'both').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-[2rem] border-2 border-gray-100 flex items-start gap-3">
                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[9px] font-black text-gray-400 uppercase leading-relaxed">Itens de provisão aparecem no seu plano futuro para ajudar você a visualizar quanto sobrará no final de cada mês.</p>
              </div>

              <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-700 transition-all">Salvar no Plano</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Provision;
