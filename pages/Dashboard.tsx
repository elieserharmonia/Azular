import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { dbClient } from '../services/dbClient';
import { Transaction, Account, Debt, Goal } from '../types';
import { formatCurrency, getCurrentMonth, getTodayDate, formatDate } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { safeStorage } from '../utils/storage';
import { useToast } from '../context/ToastContext';
import { 
  Eye, 
  EyeOff, 
  Moon, 
  Sun, 
  CalendarRange, 
  BarChart3, 
  HeartPulse, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  Gem,
  Plus,
  X,
  TrendingUp as TrendingIcon
} from 'lucide-react';
import BannerAd from '../components/BannerAd';
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

const Dashboard: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const { notifySuccess, notifyError, notifyInfo } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'conta' | 'invest'>('conta');
  
  // Modal de Lançamento no Dashboard
  const [showTxModal, setShowTxModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Transaction>>(INITIAL_FORM_STATE());
  const [isProcessing, setIsProcessing] = useState(false);
  const [foundProvision, setFoundProvision] = useState<Transaction | null>(null);

  const [showValues, setShowValues] = useState(() => safeStorage.get('azular_hide_values') !== 'true');
  const [isDark, setIsDark] = useState(() => safeStorage.get('azular_theme') === 'dark');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [txs, accs, dbt, gls] = await Promise.all([
        dbClient.getTransactions(user!.uid),
        dbClient.getAccounts(user!.uid),
        dbClient.getDebts(user!.uid),
        dbClient.getGoals(user!.uid)
      ]);
      setTransactions(txs);
      setAccounts(accs);
      setDebts(dbt);
      setGoals(gls);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    safeStorage.set('azular_theme', nextTheme ? 'dark' : 'light');
    window.document.documentElement.classList.toggle('dark', nextTheme);
  };

  const toggleValues = () => {
    const nextShow = !showValues;
    setShowValues(nextShow);
    safeStorage.set('azular_hide_values', String(!nextShow));
  };

  const dashboardStats = useMemo(() => {
    const totalBalance = accounts.reduce((acc, curr) => acc + parseNumericValue(curr.initialBalance), 0);
    const totalGoals = goals.reduce((acc, curr) => acc + parseNumericValue(curr.currentAmount), 0);
    const totalDebts = debts.reduce((acc, d) => acc + parseNumericValue(d.totalAmount), 0);
    
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

  // Lógica de detecção de previsão
  useEffect(() => {
    if (!formData.description || formData.description.length < 3 || !showTxModal) {
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
    if (match) {
      setFormData(prev => ({
        ...prev,
        categoryId: match.categoryId,
        accountId: match.accountId,
        amount: prev.amount === 0 ? parseNumericValue(match.plannedAmount || match.amount) : prev.amount
      }));
    }
  }, [formData.description, formData.type, formData.competenceMonth, transactions, showTxModal]);

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.accountId || !formData.categoryId) {
      notifyInfo("Complete os campos obrigatórios.");
      return;
    }

    setIsProcessing(true);
    try {
      const updatedData = {
        ...formData,
        amount: parseNumericValue(formData.amount),
        userId: user.uid
      };

      await dbClient.addTransaction(updatedData);
      notifySuccess("Lançamento concluído.");
      setShowTxModal(false);
      setFormData(INITIAL_FORM_STATE());
      loadData();
    } catch (err) {
      notifyError("Erro ao salvar lançamento.");
    } finally {
      setIsProcessing(false);
    }
  };

  const mask = (val: string) => showValues ? val : 'R$ •••••';

  // Removido 'LANÇAR' para ficar mais clean
  const quickActions = [
    { label: 'PREVISÃO', icon: <CalendarRange size={24} />, path: '/app/provision' },
    { label: 'PATRIMÔNIO', icon: <Gem size={24} />, path: '/app/accounts' },
    { label: 'GRÁFICOS', icon: <BarChart3 size={24} />, path: '/app/analysis' },
    { label: 'RECOMEÇO', icon: <HeartPulse size={24} />, path: '/app/restart-plan' },
  ];

  const recentTransactions = useMemo(() => {
    return transactions
      .filter(t => t.status === 'done')
      .sort((a, b) => (b.receiveDate || b.dueDate || '').localeCompare(a.receiveDate || a.dueDate || ''))
      .slice(0, 5);
  }, [transactions]);

  if (loading) return <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  const firstName = userProfile?.fullName?.split(' ')[0] || userProfile?.displayName?.split(' ')[0] || 'Usuário';

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7FE] dark:bg-slate-950 animate-in fade-in duration-500 relative">
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

            <section className="grid grid-cols-2 gap-3">
              {quickActions.map((action, idx) => (
                <button key={idx} onClick={() => navigate(action.path)} className="bg-white dark:bg-slate-900 rounded-3xl p-4 flex flex-col items-center justify-center gap-2 border border-white dark:border-slate-800 active:scale-95 transition-all shadow-sm h-24">
                  <div className="text-blue-600">{action.icon}</div>
                  <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter text-center leading-none">{action.label}</span>
                </button>
              ))}
            </section>

            {/* Histórico Recente no Dashboard para ser clean */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Últimos Lançamentos</h4>
              </div>
              <div className="space-y-3">
                {recentTransactions.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum gasto registrado ainda.</p>
                  </div>
                ) : (
                  recentTransactions.map(tx => (
                    <div key={tx.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-white dark:border-slate-800 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                          {tx.type === 'credit' ? <Plus size={16} /> : <TrendingDown size={16} />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase leading-none">{tx.description}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{formatDate(tx.dueDate || tx.receiveDate || '')}</p>
                        </div>
                      </div>
                      <p className={`text-sm font-black tracking-tighter ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {tx.type === 'credit' ? '+' : '-'}{mask(formatCurrency(tx.amount))}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
            
            <BannerAd />
          </>
        ) : (
          <div className="p-12 text-center flex flex-col items-center gap-6"><TrendingIcon size={48} className="text-blue-200" /><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Módulo de investimentos em breve.</p></div>
        )}
      </div>

      {/* Botão de Ação Flutuante (FAB) para Lançar */}
      <button 
        onClick={() => { setShowTxModal(true); setFormData(INITIAL_FORM_STATE()); }}
        className="fixed bottom-24 md:bottom-8 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-40 group"
      >
        <Plus size={32} />
        <span className="absolute right-20 bg-gray-900 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
          Novo Lançamento
        </span>
      </button>

      {/* Modal de Registro Integrado no Dashboard */}
      {showTxModal && (
        <div className="fixed inset-0 bg-blue-900/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto relative border-2 border-blue-50 dark:border-slate-800 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter dark:text-white">Lançar Real</h3>
              <button onClick={() => setShowTxModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full dark:text-slate-400"><X size={32} /></button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-6">
              <div className="flex p-2 bg-blue-50 dark:bg-slate-800 rounded-[1.5rem]">
                <button type="button" onClick={() => setFormData({...formData, type: 'credit'})} className={`flex-1 py-4 font-black uppercase rounded-[1.2rem] transition-all text-[10px] ${formData.type === 'credit' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-md' : 'text-gray-400'}`}>Recebido</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'debit'})} className={`flex-1 py-4 font-black uppercase rounded-[1.2rem] transition-all text-[10px] ${formData.type === 'debit' ? 'bg-white dark:bg-slate-700 text-red-500 shadow-md' : 'text-gray-400'}`}>Pago</button>
              </div>

              <div>
                <input required autoFocus type="text" className="w-full text-2xl font-black border-b-4 border-blue-50 dark:border-slate-800 pb-2 outline-none focus:border-blue-600 transition-all dark:text-white bg-transparent" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descrição" />
                {foundProvision && (
                  <div className="mt-2 bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-2xl flex items-center gap-3">
                    <Sparkles className="text-emerald-600" size={18} />
                    <p className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-tight">Encontramos sua previsão!</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Quanto?</label>
                  <input required type="text" className="w-full text-3xl font-black border-b-4 border-emerald-100 dark:border-slate-800 pb-2 outline-none dark:text-white bg-transparent" value={formData.amount === 0 ? '' : (formData.amount || '')} onChange={e => setFormData({...formData, amount: e.target.value as any})} placeholder="0,00" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Data</label>
                  <input required type="date" className="w-full text-xl font-black border-b-4 border-blue-50 dark:border-slate-800 pb-2 outline-none dark:text-white bg-transparent" value={(formData.type === 'credit' ? formData.receiveDate : formData.dueDate) || ''} onChange={e => setFormData({...formData, [formData.type === 'credit' ? 'receiveDate' : 'dueDate']: e.target.value, competenceMonth: e.target.value.substring(0, 7)})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Conta</label>
                  <select required className="w-full font-black border-b-4 border-blue-50 dark:border-slate-800 pb-2 bg-transparent outline-none dark:text-white" value={formData.accountId || ''} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                    <option value="">Selecione...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <CategorySelect userId={user!.uid} value={formData.categoryId || ''} direction={formData.type || 'debit'} onChange={(id) => setFormData({...formData, categoryId: id})} />
              </div>

              <button disabled={isProcessing} type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all text-xs">
                {isProcessing ? 'Salvando...' : 'Confirmar Lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;