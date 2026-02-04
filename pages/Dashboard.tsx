
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { getTransactions, getAccounts } from '../services/db';
import { Transaction, Account } from '../types';
import { formatCurrency, getMonthName } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, ArrowRightLeft, Sparkles, Waves, Eye, EyeOff, Info } from 'lucide-react';
import ChartBox from '../components/ChartBox';
import { getAiInsights, AiInsight } from '../services/aiInsights';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'both' | 'planned' | 'done'>('both');
  const [period, setPeriod] = useState<number>(6);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  
  // Controle de exibição do saldo no card de contas
  const [showAccountsBalance, setShowAccountsBalance] = useState(false);
  
  // Controle global de visibilidade de valores
  const [showValues, setShowValues] = useState(() => {
    const saved = localStorage.getItem('azular_show_values');
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('azular_show_values', String(showValues));
  }, [showValues]);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const [txs, accs, aiData] = await Promise.all([
          getTransactions(user.uid),
          getAccounts(user.uid),
          getAiInsights()
        ]);
        setTransactions(txs);
        setAccounts(accs);
        setInsights(aiData);
      } catch (err: any) {
        // Erro silencioso para o usuário, logando apenas o essencial se necessário
        console.debug("Dashboard data load issues handled.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const stats = useMemo(() => {
    const filtered = transactions.filter(t => {
      if (viewMode === 'planned') return t.status === 'planned' || t.status === 'done' || t.status === 'late';
      if (viewMode === 'done') return t.status === 'done';
      return true;
    });

    const income = filtered.filter(t => t.type === 'credit').reduce((acc, t) => acc + parseNumericValue(t.amount), 0);
    const expenses = filtered.filter(t => t.type === 'debit').reduce((acc, t) => acc + parseNumericValue(t.amount), 0);
    const totalAccountBalance = accounts.reduce((acc, curr) => acc + parseNumericValue(curr.initialBalance), 0);
    
    const months: Record<string, { month: string, income: number, expense: number, gap: number }> = {};
    transactions.forEach(t => {
      const m = t.competenceMonth;
      if (!months[m]) months[m] = { month: getMonthName(m), income: 0, expense: 0, gap: 0 };
      
      const val = parseNumericValue(t.amount);
      if (t.type === 'credit' && (viewMode === 'both' || (viewMode === 'done' && t.status === 'done') || (viewMode === 'planned' && t.status !== 'done'))) {
        months[m].income += val;
      } else if (t.type === 'debit' && (viewMode === 'both' || (viewMode === 'done' && t.status === 'done') || (viewMode === 'planned' && t.status !== 'done'))) {
        months[m].expense += val;
      }
      months[m].gap = months[m].income - months[m].expense;
    });

    const sortedMonths = Object.keys(months).sort().slice(-period).map(key => months[key]);
    
    let cumIncome = 0;
    let cumExpense = 0;
    const cumulative = sortedMonths.map(m => {
      cumIncome += m.income;
      cumExpense += m.expense;
      return { ...m, cumIncome, cumExpense, cumGap: cumIncome - cumExpense };
    });

    return { income, expenses, gap: income - expenses, chartData: cumulative, totalAccountBalance };
  }, [transactions, accounts, viewMode, period]);

  const maskValue = (val: string) => showValues ? val : '••••••';

  if (loading) return <div className="p-12 text-center font-black uppercase text-blue-600 animate-pulse">Azulando seus dados...</div>;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">Início</h2>
          <p className="text-blue-500 text-xs font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
            <Waves size={14} /> Panorama Geral Azular
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowValues(!showValues)}
            className="p-3 bg-white border-2 border-blue-50 rounded-2xl text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
            title={showValues ? "Ocultar Valores" : "Mostrar Valores"}
          >
            {showValues ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
          <div className="bg-white border-2 border-blue-50 rounded-[1.5rem] flex p-1.5 shadow-sm">
            {(['planned', 'done', 'both'] as const).map(mode => (
              <button 
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-5 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all ${viewMode === mode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-blue-600'}`}
              >
                {mode === 'planned' ? 'Previsto' : mode === 'done' ? 'Realizado' : 'Tudo'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Card de Insights Placeholder */}
      <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl text-white flex flex-col md:flex-row items-start gap-6 animate-in fade-in slide-in-from-top-4 duration-700 relative overflow-hidden group">
        <div className="bg-white/20 p-4 rounded-2xl shrink-0">
          <Sparkles size={28} className="text-blue-100" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="font-black text-[10px] uppercase tracking-widest opacity-60">Insights do Azular</h4>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">Em breve</span>
          </div>
          <p className="text-xl font-bold leading-snug">
            {insights.length > 0 ? insights[0].message : "Estamos preparando recomendações para acelerar seu Recomeço."}
          </p>
        </div>
        <button className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
          Quero Ativar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border-2 border-blue-50">
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest">Ganhos</span>
            <TrendingUp size={20} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tighter">{maskValue(formatCurrency(stats.income))}</div>
        </div>
        <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border-2 border-blue-50">
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest">Gastos</span>
            <TrendingDown size={20} className="text-red-500" />
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tighter">{maskValue(formatCurrency(stats.expenses))}</div>
        </div>
        <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border-2 border-blue-50">
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest">Saldo Livre</span>
            <ArrowRightLeft size={20} className="text-blue-600" />
          </div>
          <div className={`text-2xl font-black tracking-tighter ${stats.gap >= 0 ? 'text-gray-900' : 'text-red-500'}`}>{maskValue(formatCurrency(stats.gap))}</div>
        </div>
        
        {/* Card de Contas */}
        <div 
          onClick={() => setShowAccountsBalance(!showAccountsBalance)}
          className="bg-white p-7 rounded-[2.5rem] shadow-sm border-2 border-blue-50 cursor-pointer hover:border-blue-300 hover:scale-[1.02] transition-all group active:scale-95"
        >
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-blue-600 transition-colors">
              {showAccountsBalance ? 'Saldo Unificado' : 'Contas'}
            </span>
            <div className="flex items-center gap-2">
               <button 
                  onClick={(e) => { e.stopPropagation(); setShowValues(!showValues); }}
                  className="text-gray-300 hover:text-blue-600 transition-colors"
               >
                 {showValues ? <Eye size={14} /> : <EyeOff size={14} />}
               </button>
               <Wallet size={20} className="text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tighter">
            {showAccountsBalance 
              ? maskValue(formatCurrency(stats.totalAccountBalance)) 
              : accounts.length
            }
          </div>
          <p className="text-[8px] font-black uppercase text-blue-300 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            Clique para {showAccountsBalance ? 'ver total de contas' : 'ver saldo total'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
        <ChartBox title="Fluxo por Mês" hasData={stats.chartData.length > 0} heightClass="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
              <Legend iconType="circle" />
              <Bar dataKey="income" name="Ganhos" fill="#34D399" radius={[10, 10, 0, 0]} />
              <Bar dataKey="expense" name="Gastos" fill="#F87171" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Progresso Acumulado" hasData={stats.chartData.length > 0} heightClass="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
              <Legend iconType="circle" />
              <Line type="monotone" dataKey="cumGap" name="Saldo Acumulado" stroke="#2563EB" strokeWidth={5} dot={{ r: 6, fill: '#2563EB', strokeWidth: 3, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartBox>
      </div>
    </div>
  );
};

export default Dashboard;
