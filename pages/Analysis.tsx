
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { getTransactions, getCategories } from '../services/db';
import { Transaction, Category } from '../types';
import { formatCurrency } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { BrainCircuit, Activity } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ChartShell from '../components/ChartShell';

const Analysis: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getTransactions(user.uid), getCategories(user.uid)]).then(([txs, cats]) => {
      setTransactions(txs);
      setCategories(cats);
      setLoading(false);
    });
  }, [user]);

  const categoryShare = useMemo(() => {
    const shares: Record<string, number> = {};
    transactions.filter(t => t.type === 'debit' && t.status === 'done').forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId)?.name || 'Outros';
      shares[cat] = (shares[cat] || 0) + parseNumericValue(t.amount);
    });
    const total = Object.values(shares).reduce((a, b) => a + b, 0);
    return Object.entries(shares)
      .map(([name, value]) => ({ 
        name, 
        value, 
        percent: total > 0 ? (value / total) * 100 : 0 
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  useEffect(() => {
    if (!loading && transactions.length > 0 && !aiInsight && user) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analise essas finanças de forma muito humana e sem julgamento para o app Azular: ${transactions.length} transações. Dê um conselho de cuidado com a casa financeira em português (máx 15 palavras).`,
      }).then((res) => setAiInsight(res.text));
    }
  }, [loading, transactions, aiInsight, user]);

  const COLORS = ['#2563EB', '#34D399', '#F87171', '#FBBF24', '#8B5CF6', '#EC4899'];

  if (loading) return <div className="p-10 text-center uppercase font-black text-blue-600 animate-pulse">Analisando sua jornada...</div>;

  return (
    <div className="space-y-10 pb-20">
      <header>
        <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900 leading-none">Análise</h2>
        <p className="text-blue-500 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
          <Activity size={14} /> Onde seu dinheiro mais circula
        </p>
      </header>

      {aiInsight && (
        <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl flex items-start gap-6 relative overflow-hidden">
          <div className="p-3 bg-white/20 rounded-2xl"><BrainCircuit size={28} /></div>
          <div>
            <h4 className="font-black uppercase text-[10px] tracking-widest mb-1 opacity-60">Insight Azular</h4>
            <p className="text-xl font-bold leading-tight">{aiInsight}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-12">
        <ChartShell 
          title="Distribuição de Gastos Reais" 
          hasData={categoryShare.length > 0} 
          heightClass="h-[450px]"
          fallback={
            <div className="space-y-4 py-2">
              {categoryShare.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase text-gray-600">{cat.name}</span>
                    <span className="text-[10px] font-black text-blue-600">{formatCurrency(cat.value)}</span>
                  </div>
                  <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-1000"
                      style={{ 
                        width: `${cat.percent}%`,
                        backgroundColor: COLORS[idx % COLORS.length]
                      }}
                    />
                  </div>
                  <span className="text-[8px] font-bold text-gray-400 uppercase">{cat.percent.toFixed(1)}% do total</span>
                </div>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryShare}
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryShare.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(parseNumericValue(value))} />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </div>
  );
};

export default Analysis;
