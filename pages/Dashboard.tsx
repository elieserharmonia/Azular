
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { getEntries } from '../services/db';
import { Transaction } from '../types';
import { formatCurrency, getTodayDate } from '../utils/formatters';
import { 
  Plus, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Calendar, 
  AlertCircle, 
  ChevronRight,
  Wallet,
  CheckCircle2
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, userProfile, isPreview } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    try {
      const data = await getEntries(user!.uid);
      setEntries(data || []);
    } catch (err) {
      console.warn("[Dashboard] Erro ao carregar entradas:", err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    try {
      const today = getTodayDate() || '';
      const month = today.substring(0, 7);
      
      const monthEntries = entries.filter(e => e.vencimento && e.vencimento.startsWith(month));
      
      const aPagar = monthEntries.filter(e => e.tipo === 'pagar' && e.status !== 'cancelado');
      const aReceber = monthEntries.filter(e => e.tipo === 'receber' && e.status !== 'cancelado');

      return {
        pagarPrevisto: aPagar.reduce((acc, e) => acc + (e.valor || 0), 0),
        pagarReal: aPagar.filter(e => e.status === 'pago').reduce((acc, e) => acc + (e.valor || 0), 0),
        receberPrevisto: aReceber.reduce((acc, e) => acc + (e.valor || 0), 0),
        receberReal: aReceber.filter(e => e.status === 'recebido').reduce((acc, e) => acc + (e.valor || 0), 0),
        atrasadas: entries.filter(e => e.vencimento && e.vencimento < today && !['pago', 'recebido', 'cancelado'].includes(e.status || '')).length
      };
    } catch (err) {
      console.error("[Dashboard] Erro no cálculo de estatísticas:", err);
      return { pagarPrevisto: 0, pagarReal: 0, receberPrevisto: 0, receberReal: 0, atrasadas: 0 };
    }
  }, [entries]);

  if (loading) return null;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header Balance */}
      <header className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Saldo Projetado (Mês)</p>
          <h2 className="text-4xl font-black tracking-tighter">
            {formatCurrency(stats.receberPrevisto - stats.pagarPrevisto)}
          </h2>
          <div className="flex gap-4 mt-6">
            <div className="flex-1 bg-white/10 p-3 rounded-2xl backdrop-blur-md">
              <p className="text-[8px] font-black uppercase opacity-60">A Receber</p>
              <p className="font-black text-sm text-emerald-300">{formatCurrency(stats.receberPrevisto)}</p>
            </div>
            <div className="flex-1 bg-white/10 p-3 rounded-2xl backdrop-blur-md">
              <p className="text-[8px] font-black uppercase opacity-60">A Pagar</p>
              <p className="font-black text-sm text-red-300">{formatCurrency(stats.pagarPrevisto)}</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
      </header>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => navigate('/app/contas/novo?tipo=pagar')}
          className="bg-white p-6 rounded-[2rem] border-2 border-red-50 flex flex-col items-center gap-3 active:scale-95 transition-all shadow-sm group"
        >
          <div className="p-3 bg-red-50 text-red-500 rounded-2xl group-hover:bg-red-500 group-hover:text-white transition-colors">
            <ArrowDownCircle size={24} />
          </div>
          <span className="text-[10px] font-black uppercase text-gray-400">Conta a Pagar</span>
        </button>
        <button 
          onClick={() => navigate('/app/contas/novo?tipo=receber')}
          className="bg-white p-6 rounded-[2rem] border-2 border-emerald-50 flex flex-col items-center gap-3 active:scale-95 transition-all shadow-sm group"
        >
          <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <ArrowUpCircle size={24} />
          </div>
          <span className="text-[10px] font-black uppercase text-gray-400">Conta a Receber</span>
        </button>
      </section>

      {/* Filters/Status shortcuts */}
      <section className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {[
          { label: 'Hoje', icon: <Calendar size={14}/>, color: 'blue' },
          { label: 'Atrasadas', icon: <AlertCircle size={14}/>, color: 'red', count: stats.atrasadas },
          { label: '7 Dias', icon: <Calendar size={14}/>, color: 'indigo' },
          { label: 'Pagas', icon: <CheckCircle2 size={14}/>, color: 'emerald' },
        ].map((btn, i) => (
          <button key={i} className={`flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-50 rounded-2xl whitespace-nowrap shadow-sm`}>
            <span className={`text-${btn.color}-500`}>{btn.icon}</span>
            <span className="text-[10px] font-black uppercase text-gray-600">{btn.label}</span>
            {btn.count !== undefined && btn.count > 0 && (
              <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">{btn.count}</span>
            )}
          </button>
        ))}
      </section>

      {/* Recent Activity */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Contas Próximas</h4>
          <button onClick={() => navigate('/app/contas')} className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1">Ver tudo <ChevronRight size={12}/></button>
        </div>
        
        <div className="space-y-3">
          {entries.slice(0, 5).map(entry => (
            <div key={entry.id} className="bg-white p-5 rounded-[2rem] border-2 border-gray-50 flex items-center justify-between shadow-sm active:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entry.tipo === 'receber' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {entry.tipo === 'receber' ? <ArrowUpCircle size={20}/> : <ArrowDownCircle size={20}/>}
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 uppercase leading-none">{entry.descricao}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{entry.vencimento}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black tracking-tighter ${entry.tipo === 'receber' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(entry.valor)}
                </p>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${entry.status === 'pago' || entry.status === 'recebido' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                  {entry.status}
                </span>
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Nenhuma conta agendada...</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
