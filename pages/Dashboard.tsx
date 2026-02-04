import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { getTransactions, getAccounts } from '../services/db';
import { Transaction, Account } from '../types';
import { formatCurrency } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { 
  Eye, 
  EyeOff, 
  Bell, 
  Moon, 
  Sun, 
  ChevronRight, 
  Plus, 
  CalendarRange, 
  HeartPulse, 
  Wallet, 
  Tags, 
  Target, 
  FileText, 
  UserCircle, 
  HelpCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Search
} from 'lucide-react';
import BannerAd from '../components/BannerAd';

const Dashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'conta' | 'invest'>('conta');
  
  // States Locais com Persistência
  const [showValues, setShowValues] = useState(() => localStorage.getItem('azular_hide_values') !== 'true');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('azular_theme') === 'dark');

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const [txs, accs] = await Promise.all([
          getTransactions(user.uid),
          getAccounts(user.uid)
        ]);
        setTransactions(txs);
        setAccounts(accs);
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

  const stats = useMemo(() => {
    const totalBalance = accounts.reduce((acc, curr) => acc + parseNumericValue(curr.initialBalance), 0);
    // Filtrar últimas transações para o mini-extrato
    const recent = transactions.filter(t => t.status === 'done').slice(0, 5);
    return { totalBalance, recent };
  }, [transactions, accounts]);

  const mask = (val: string) => showValues ? val : 'R$ ••••';

  const quickActions = [
    { label: 'Lançar', icon: <Plus className="text-emerald-500" />, path: '/app/transactions' },
    { label: 'Provisão', icon: <CalendarRange className="text-blue-500" />, path: '/app/provision' },
    { label: 'Recomeço', icon: <HeartPulse className="text-red-400" />, path: '/app/restart-plan' },
    { label: 'Contas', icon: <Wallet className="text-amber-500" />, path: '/app/accounts' },
    { label: 'Categorias', icon: <Tags className="text-indigo-500" />, path: '/app/profile' },
    { label: 'Sonhos', icon: <Target className="text-purple-500" />, path: '/app/goals' },
    { label: 'Relatórios', icon: <FileText className="text-slate-500" />, path: '/app/reports' },
    { label: 'Perfil', icon: <UserCircle className="text-blue-600" />, path: '/app/profile' },
    { label: 'Ajuda', icon: <HelpCircle className="text-gray-400" />, path: '#' },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Preparando seu banco...</p>
    </div>
  );

  const firstName = userProfile?.fullName?.split(' ')[0] || userProfile?.displayName?.split(' ')[0] || 'Usuário';

  return (
    <div className="animate-in fade-in duration-700">
      {/* 1) HEADER ESTILO BANCO */}
      <header className="bank-gradient text-white p-6 md:rounded-b-[3rem] shadow-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/app/profile')}>
            <div className="w-12 h-12 bg-white/20 rounded-full border-2 border-white/30 flex items-center justify-center font-black text-xl shadow-inner group-hover:scale-105 transition-transform">
              {firstName.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-none">Olá, {firstName}</h2>
              <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mt-1">Meu Perfil</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full"></span>
            </button>
            <button onClick={toggleValues} className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              {showValues ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* 2) SELETOR DE ABAS */}
      <div className="flex border-b border-blue-50 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 md:mt-0">
        <button 
          onClick={() => setActiveTab('conta')}
          className={`py-4 px-6 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'conta' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
        >
          Conta
        </button>
        <button 
          onClick={() => setActiveTab('invest')}
          className={`py-4 px-6 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'invest' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}
        >
          Investimentos
        </button>
      </div>

      <div className="p-6 space-y-8 max-w-5xl mx-auto">
        {activeTab === 'conta' ? (
          <>
            {/* 3) BLOCO SALDO */}
            <section className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-blue-50 dark:border-slate-700 flex justify-between items-center group cursor-pointer hover:border-blue-200 transition-colors">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Saldo em conta</span>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                  {mask(formatCurrency(stats.totalBalance))}
                </h3>
              </div>
              <button 
                onClick={() => navigate('/app/transactions')}
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all"
              >
                Gerenciar
              </button>
            </section>

            {/* 4) BOTÃO EXTRATO */}
            <button 
              onClick={() => navigate('/app/transactions')}
              className="w-full bg-white dark:bg-slate-800 p-6 rounded-3xl border border-blue-50 dark:border-slate-700 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
                  <Search size={22} />
                </div>
                <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">Extrato da conta</span>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* 5) GRID DE AÇÕES */}
            <section className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-9 gap-4">
              {quickActions.map((action, idx) => (
                <button 
                  key={idx}
                  onClick={() => action.path !== '#' && navigate(action.path)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-blue-50 dark:border-slate-700 flex items-center justify-center transition-all group-hover:scale-105 group-active:scale-90 group-hover:border-blue-300">
                    {React.cloneElement(action.icon as React.ReactElement, { size: 24 })}
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter text-center line-clamp-1">
                    {action.label}
                  </span>
                </button>
              ))}
            </section>

            {/* RECENTES (MINI EXTRATO) */}
            <section className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Últimas Movimentações</h4>
                <button onClick={() => navigate('/app/transactions')} className="text-[9px] font-black text-blue-600 uppercase">Ver tudo</button>
              </div>
              <div className="space-y-3">
                {stats.recent.map(tx => (
                  <div key={tx.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-blue-50 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${tx.type === 'credit' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-red-50 dark:bg-red-900/20 text-red-500'}`}>
                        {tx.type === 'credit' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate uppercase">{tx.description}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                          {accounts.find(a => a.id === tx.accountId)?.name || 'Conta'} • {new Date(tx.dueDate || '').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className={`text-sm font-black tracking-tight ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {showValues ? (tx.type === 'credit' ? '+' : '-') + formatCurrency(tx.amount) : '••••'}
                    </div>
                  </div>
                ))}
                {stats.recent.length === 0 && (
                  <div className="p-10 text-center border-2 border-dashed border-blue-50 dark:border-slate-700 rounded-[2rem]">
                    <p className="text-[10px] font-bold text-slate-300 uppercase">Nenhuma transação recente</p>
                  </div>
                )}
              </div>
            </section>

            <BannerAd />
          </>
        ) : (
          <div className="p-20 text-center flex flex-col items-center gap-6 animate-in slide-in-from-bottom-4">
            <div className="p-6 bg-blue-50 dark:bg-slate-800 rounded-full text-blue-600">
               <Sparkles size={48} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Módulo de Investimentos</h3>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">Estamos construindo ferramentas de inteligência para seu futuro.</p>
            </div>
            <button onClick={() => setActiveTab('conta')} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs shadow-xl">Voltar para Conta</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;