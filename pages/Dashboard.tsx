import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { getTransactions, getAccounts, getDebts, getGoals } from '../services/db';
import { Transaction, Account, Debt, Goal } from '../types';
import { formatCurrency, getCurrentMonth } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { 
  Eye, 
  EyeOff, 
  Bell, 
  Moon, 
  Sun, 
  ChevronRight, 
  PlusCircle, 
  CalendarRange, 
  BarChart3, 
  Wallet, 
  HeartPulse, 
  User as UserIcon, 
  FileText, 
  HelpCircle,
  Sparkles,
  Landmark,
  TrendingUp as TrendingIcon,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Zap,
  Gem
} from 'lucide-react';
import BannerAd from '../components/BannerAd';

const Dashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'conta' | 'invest'>('conta');
  
  const [showValues, setShowValues] = useState(() => localStorage.getItem('azular_hide_values') !== 'true');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('azular_theme') === 'dark');

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const [txs, accs, dbt, gls] = await Promise.all([
          getTransactions(user.uid),
          getAccounts(user.uid),
          getDebts(user.uid),
          getGoals(user.uid)
        ]);
        setTransactions(txs);
        setAccounts(accs);
        setDebts(dbt);
        setGoals(gls);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    localStorage.setItem('azular_theme', nextTheme ? 'dark' : 'light');
    window.document.documentElement.classList.toggle('dark', nextTheme);
  };

  const toggleValues = () => {
    const nextShow = !showValues;
    setShowValues(nextShow);
    localStorage.setItem('azular_hide_values', String(!nextShow));
  };

  const dashboardStats = useMemo(() => {
    const totalBalance = accounts.reduce((acc, curr) => acc + parseNumericValue(curr.initialBalance), 0);
    const totalGoals = goals.reduce((acc, curr) => acc + parseNumericValue(curr.currentAmount), 0);
    const totalDebts = debts.reduce((acc, curr) => acc + parseNumericValue(curr.totalAmount), 0);
    
    const netWorth = (totalBalance + totalGoals) - totalDebts;

    const currentMonth = getCurrentMonth();
    const monthTxs = transactions.filter(t => t.competenceMonth === currentMonth && t.type === 'debit');
    
    const plannedTotal = monthTxs.reduce((acc, t) => acc + parseNumericValue(t.plannedAmount || t.amount), 0);
    const realTotal = monthTxs.filter(t => t.status === 'done').reduce((acc, t) => acc + parseNumericValue(t.amount), 0);
    
    const gap = plannedTotal - realTotal;
    const usagePercent = plannedTotal > 0 ? (realTotal / plannedTotal) * 100 : 0;

    return { totalBalance, plannedTotal, realTotal, gap, usagePercent, netWorth };
  }, [accounts, transactions, debts, goals]);

  const coachFeedback = useMemo(() => {
    const { usagePercent, gap } = dashboardStats;
    if (dashboardStats.plannedTotal === 0) return { title: "Inicie seu Plano", msg: "Lance suas previsões para eu te guiar.", color: "blue", icon: <Sparkles size={20} /> };
    if (usagePercent > 100) return { title: "Alerta Vermelho!", msg: `Você superou sua previsão em ${formatCurrency(Math.abs(gap))}.`, color: "red", icon: <AlertTriangle size={20} /> };
    if (usagePercent >= 85) return { title: "Zona de Risco!", msg: `Seu gap é de apenas ${formatCurrency(gap)}. Cuidado.`, color: "orange", icon: <TrendingDown size={20} /> };
    return { title: "Controle em Dia", msg: `Você ainda tem ${formatCurrency(gap)} de fôlego.`, color: "emerald", icon: <CheckCircle2 size={20} /> };
  }, [dashboardStats]);

  const mask = (val: string) => showValues ? val : 'R$ •••••';

  const quickActions = [
    { label: 'LANÇAR', icon: <PlusCircle />, path: '/app/transactions', state: { openModal: true } },
    { label: 'PREVISÃO', icon: <CalendarRange />, path: '/app/provision' },
    { label: 'PATRIMÔNIO', icon: <Gem />, path: '/app/accounts' }, // Agora leva para contas/patrimônio
    { label: 'GRÁFICOS', icon: <BarChart3 />, path: '/app/analysis' },
    { label: 'RECOMEÇO', icon: <HeartPulse />, path: '/app/restart-plan' },
    { label: 'RELATÓRIOS', icon: <FileText />, path: '/app/reports' },
  ];

  if (loading) return <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  const firstName = userProfile?.fullName?.split(' ')[0] || userProfile?.displayName?.split(' ')[0] || 'Usuário';

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7FE] dark:bg-slate-950 animate-in fade-in duration-500">
      <header className="bg-blue-600 dark:bg-blue-700 text-white pt-10 pb-4 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/app/profile')}>
              <div className="w-11 h-11 bg-white/20 rounded-full border border-white/30 flex items-center justify-center font-black text-lg overflow-hidden">
                {userProfile?.avatarUrl ? <img src={userProfile.avatarUrl} className="w-full h-full object-cover" /> : firstName.charAt(0)}
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-black tracking-tight leading-none flex items-center gap-1">Olá, {firstName}</h2>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-1">Meu Perfil</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={toggleTheme}>{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
              <button onClick={toggleValues}>{showValues ? <Eye size={20} /> : <EyeOff size={20} />}</button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-12 pt-2">
            <button onClick={() => setActiveTab('conta')} className={`pb-3 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'conta' ? 'text-white border-b-2 border-white' : 'text-white/40'}`}>Conta</button>
            <button onClick={() => setActiveTab('invest')} className={`pb-3 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'invest' ? 'text-white border-b-2 border-white' : 'text-white/40'}`}>Investimentos</button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-5 py-6 space-y-5 animate-slide-up">
        {activeTab === 'conta' ? (
          <>
            <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm flex justify-between items-center border border-white dark:border-slate-800">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Disponível</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{mask(formatCurrency(dashboardStats.totalBalance))}</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Patrimônio Líquido</span>
                <p className={`text-sm font-black ${dashboardStats.netWorth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{mask(formatCurrency(dashboardStats.netWorth))}</p>
              </div>
            </section>

            <div onClick={() => navigate('/app/provision')} className={`p-5 rounded-3xl border flex flex-col gap-4 relative overflow-hidden transition-all cursor-pointer group active:scale-[0.98] ${coachFeedback.color === 'emerald' ? 'bg-emerald-50 border-emerald-100' : coachFeedback.color === 'red' ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
              <div className="flex items-center justify-between relative z-10">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm">{coachFeedback.icon}</div>
                    <div>
                        <h4 className="font-black text-xs uppercase text-slate-900">{coachFeedback.title}</h4>
                        <p className="text-[9px] font-bold uppercase text-slate-500">{coachFeedback.msg}</p>
                    </div>
                 </div>
                 {showValues && (
                   <div className="text-right">
                      <span className="text-[8px] font-black text-slate-400 uppercase block">Fôlego do Mês</span>
                      <span className={`text-xs font-black ${dashboardStats.gap >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(dashboardStats.gap)}</span>
                   </div>
                 )}
              </div>
              <div className="w-full bg-black/5 rounded-full h-2 overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${dashboardStats.usagePercent > 85 ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, dashboardStats.usagePercent)}%` }} />
              </div>
            </div>

            <section className="grid grid-cols-3 gap-3">
              {quickActions.map((action, idx) => (
                <button key={idx} onClick={() => navigate(action.path, { state: (action as any).state })} className="bg-white dark:bg-slate-900 rounded-3xl p-4 flex flex-col items-center justify-center gap-2 border border-white dark:border-slate-800 active:scale-95 transition-all shadow-sm h-24">
                  <div className="text-blue-600">{React.cloneElement(action.icon as React.ReactElement, { size: 24 })}</div>
                  <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter text-center leading-none">{action.label}</span>
                </button>
              ))}
            </section>
            <BannerAd />
          </>
        ) : (
          <div className="p-12 text-center flex flex-col items-center gap-6"><TrendingIcon size={48} className="text-blue-200" /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Módulo de investimentos em breve.</p></div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;