import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { getTransactions, getCategories } from '../services/db';
import { getAiInsights, AiInsight } from '../services/aiInsights';
import { Transaction, Category } from '../types';
import { formatCurrency, getMonthName } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ComposedChart, Area
} from 'recharts';
import { 
  BrainCircuit, 
  Activity, 
  Lock, 
  Play, 
  Sparkles, 
  Loader2, 
  TrendingUp, 
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import ChartShell from '../components/ChartShell';
import BannerAd from '../components/BannerAd';
import RewardedAdModal from '../components/RewardedAdModal';
import { adService } from '../services/adService';

const Analysis: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [hasDeepInsights, setHasDeepInsights] = useState(adService.hasBenefit('DEEP_INSIGHTS'));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, cats] = await Promise.all([getTransactions(user!.uid), getCategories(user!.uid)]);
      setTransactions(txs);
      setCategories(cats);
      
      if (hasDeepInsights) {
        fetchAiInsights(txs);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAiInsights = async (txs: Transaction[]) => {
    setLoadingAi(true);
    const data = await getAiInsights(txs);
    setInsights(data);
    setLoadingAi(false);
  };

  // Cores do Sistema Azular
  const AZULAR_COLORS = {
    forecastEntry: '#93C5FD', // Blue 300
    forecastExit: '#FCA5A5',  // Red 300
    actualEntry: '#1E40AF',   // Blue 800
    actualExit: '#991B1B',    // Red 800
    gap: '#6366F1',           // Indigo 500
    grid: '#E2E8F0'
  };

  // Motor de processamento de dados para os gráficos
  const chartData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}`);
    
    let accForecastEntry = 0;
    let accForecastExit = 0;
    let accActualEntry = 0;
    let accActualExit = 0;
    let accGap = 0;

    return months.map(month => {
      const monthTxs = transactions.filter(t => t.competenceMonth === month);
      
      const fEntry = monthTxs.filter(t => t.type === 'credit' && t.status === 'planned').reduce((acc, t) => acc + parseNumericValue(t.plannedAmount || t.amount), 0);
      const fExit = monthTxs.filter(t => t.type === 'debit' && t.status === 'planned').reduce((acc, t) => acc + parseNumericValue(t.plannedAmount || t.amount), 0);
      
      const aEntry = monthTxs.filter(t => t.type === 'credit' && t.status === 'done').reduce((acc, t) => acc + parseNumericValue(t.amount), 0);
      const aExit = monthTxs.filter(t => t.type === 'debit' && t.status === 'done').reduce((acc, t) => acc + parseNumericValue(t.amount), 0);

      const gap = fEntry - fExit;
      
      accForecastEntry += fEntry;
      accForecastExit += fExit;
      accActualEntry += aEntry;
      accActualExit += aExit;
      accGap += gap;

      return {
        name: getMonthName(month).split(' de ')[0].toUpperCase(),
        forecastEntry: fEntry,
        forecastExit: fExit,
        actualEntry: aEntry,
        actualExit: aExit,
        accForecastEntry,
        accForecastExit,
        accActualEntry,
        accActualExit,
        gap,
        accGap
      };
    });
  }, [transactions, selectedYear]);

  const handleAdComplete = () => {
    adService.grantBenefit('DEEP_INSIGHTS');
    setHasDeepInsights(true);
    setShowAdModal(false);
    fetchAiInsights(transactions);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-blue-50">
          <p className="text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-6 items-center">
              <span className="text-[10px] font-bold text-gray-600 uppercase" style={{ color: entry.color }}>{entry.name}:</span>
              <span className="text-xs font-black text-gray-900">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return <div className="p-10 text-center uppercase font-black text-blue-600 animate-pulse">Analisando sua jornada...</div>;

  return (
    <div className="space-y-10 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">Análise</h2>
          <p className="text-blue-500 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
            <Activity size={14} /> Ciclos e Tendências
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-blue-50">
          <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-blue-50 rounded-xl"><ChevronLeft size={20} /></button>
          <span className="text-sm font-black text-gray-900 px-2">{selectedYear}</span>
          <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-blue-50 rounded-xl"><ChevronRight size={20} /></button>
        </div>
      </header>

      {/* IA Insights Section */}
      {!hasDeepInsights ? (
        <div className="bg-white p-10 rounded-[2.5rem] border-2 border-blue-50 shadow-sm flex flex-col items-center text-center gap-6 animate-in slide-in-from-top-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Lock size={32} /></div>
          <div>
            <h4 className="font-black uppercase text-xs tracking-widest mb-2 text-gray-900">Mentor Azular (IA)</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest max-w-xs">Apoie o projeto para liberar insights estratégicos baseados nos seus números.</p>
          </div>
          <button 
            onClick={() => setShowAdModal(true)}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all"
          >
            <Play size={16} /> Liberar Mentor
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {loadingAi ? (
            <div className="bg-blue-600/10 p-8 rounded-[2.5rem] flex items-center justify-center gap-4">
              <Loader2 className="animate-spin text-blue-600" />
              <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">IA analisando seus números...</span>
            </div>
          ) : (
            insights.map((insight, idx) => (
              <div key={idx} className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl flex items-start gap-6 relative overflow-hidden animate-in fade-in slide-in-from-left">
                <div className="p-3 bg-white/20 rounded-2xl"><BrainCircuit size={28} /></div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-black uppercase text-[10px] tracking-widest opacity-60">{insight.badge}</h4>
                    <Sparkles size={12} className="text-blue-200" />
                  </div>
                  <p className="text-xl font-bold leading-tight">{insight.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Grid de Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* 1. Gráfico Previsão Acc */}
        <ChartShell title="Previsão Acumulada (Tendência)" fallback={null} heightClass="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={AZULAR_COLORS.grid} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" iconType="circle" />
              <Line name="Previsão Entrada (Acc)" type="monotone" dataKey="accForecastEntry" stroke={AZULAR_COLORS.forecastEntry} strokeDasharray="5 5" strokeWidth={3} dot={false} />
              <Line name="Previsão Saída (Acc)" type="monotone" dataKey="accForecastExit" stroke={AZULAR_COLORS.forecastExit} strokeDasharray="5 5" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartShell>

        {/* 2. Gráfico Previsão Mês */}
        <ChartShell title="Previsão Mensal (Planejamento)" fallback={null} heightClass="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={AZULAR_COLORS.grid} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" iconType="circle" />
              <Bar name="Prev. Entrada" dataKey="forecastEntry" fill={AZULAR_COLORS.forecastEntry} radius={[4, 4, 0, 0]} stroke={AZULAR_COLORS.forecastEntry} strokeDasharray="4 4" />
              <Bar name="Prev. Saída" dataKey="forecastExit" fill={AZULAR_COLORS.forecastExit} radius={[4, 4, 0, 0]} stroke={AZULAR_COLORS.forecastExit} strokeDasharray="4 4" />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        {/* 3. Gráfico Realizado Acc */}
        <ChartShell title="Realizado Acumulado (Caixa)" fallback={null} heightClass="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={AZULAR_COLORS.grid} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" iconType="circle" />
              <Line name="Entrada Real (Acc)" type="monotone" dataKey="accActualEntry" stroke={AZULAR_COLORS.actualEntry} strokeWidth={4} dot={{ r: 4, fill: AZULAR_COLORS.actualEntry }} />
              <Line name="Saída Real (Acc)" type="monotone" dataKey="accActualExit" stroke={AZULAR_COLORS.actualExit} strokeWidth={4} dot={{ r: 4, fill: AZULAR_COLORS.actualExit }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartShell>

        {/* 4. Gráfico Realizado Mês */}
        <ChartShell title="Realizado Mensal (Fluxo)" fallback={null} heightClass="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={AZULAR_COLORS.grid} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" iconType="circle" />
              <Bar name="Entrada Real" dataKey="actualEntry" fill={AZULAR_COLORS.actualEntry} radius={[4, 4, 0, 0]} />
              <Bar name="Saída Real" dataKey="actualExit" fill={AZULAR_COLORS.actualExit} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        {/* 5. Gráfico GAP e Saúde Financeira */}
        <ChartShell title="Análise de GAP (Fôlego vs. Acumulado)" fallback={null} heightClass="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={AZULAR_COLORS.grid} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900}} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" iconType="circle" />
              <Bar name="GAP Mensal (Prev)" dataKey="gap" fill="#C7D2FE" radius={[4, 4, 0, 0]} />
              <Line name="GAP Acumulado" type="stepAfter" dataKey="accGap" stroke={AZULAR_COLORS.gap} strokeWidth={4} dot={true} />
              <Area type="monotone" dataKey="accGap" fill={AZULAR_COLORS.gap} opacity={0.1} stroke="none" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartShell>

      </div>

      <BannerAd />

      {showAdModal && (
        <RewardedAdModal 
          benefitName="Mentor Azular (IA)"
          onComplete={handleAdComplete}
          onCancel={() => setShowAdModal(false)}
        />
      )}
    </div>
  );
};

export default Analysis;