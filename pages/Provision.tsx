
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { getTransactions, addTransaction } from '../services/db';
import { Transaction } from '../types';
import { formatCurrency, getCurrentMonth, getMonthName } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Line, Bar
} from 'recharts';
import { 
  TrendingUp, Info, Waves, Target, CheckCircle, ChevronDown, Calendar, Plus, RefreshCw, AlertCircle
} from 'lucide-react';
import ChartShell from '../components/ChartShell';
import SimpleBars from '../components/SimpleBars';

const Provision: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(12);
  const [loading, setLoading] = useState(true);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const txs = await getTransactions(user!.uid);
    setTransactions(txs);
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
        {/* Lado A: Resumo do Plano */}
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
                className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all"
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

        {/* Lado B: Visualização do Plano */}
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

          <div className="bg-blue-50 p-6 rounded-[2rem] border-2 border-blue-100 flex items-start gap-4">
            <Info className="text-blue-600 mt-1" size={20} />
            <div>
              <h4 className="text-blue-900 font-black uppercase text-xs">O que é a Provisão?</h4>
              <p className="text-blue-700 text-[10px] font-medium leading-relaxed mt-1">
                Aqui você cadastra seus **gastos e ganhos fixos** que acontecem todo mês (aluguel, salário, conta de luz média). Isto cria o seu "Esqueleto Financeiro" e te ajuda a prever o futuro antes de gastar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Provision;
