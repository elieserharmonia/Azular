
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { firebaseEnabled } from '../lib/firebase';
import { getDb } from '../services/firestoreClient';
import { getDebts } from '../services/db';
import { Debt } from '../types';
import { formatCurrency } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { HeartPulse, Plus, X, ArrowRight, ShieldCheck, Sparkles, Trash2, Info, RefreshCw } from 'lucide-react';

const RestartPlan: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('snowball');
  const [extraPayment, setExtraPayment] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    totalAmount: 0 as any,
    monthlyPayment: 0 as any,
    interestRate: 0 as any
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await getDebts(user.uid);
      setDebts(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      if (!firebaseEnabled) {
        alert("Modo local: recarregue para ver os dados simulados.");
      } else {
        const db = await getDb();
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        await addDoc(collection(db, 'debts'), {
          ...formData,
          totalAmount: parseNumericValue(formData.totalAmount),
          monthlyPayment: parseNumericValue(formData.monthlyPayment),
          interestRate: parseNumericValue(formData.interestRate),
          userId: user.uid,
          priority: 'medium',
          createdAt: serverTimestamp()
        });
      }
      setShowModal(false);
      setFormData({ name: '', totalAmount: 0, monthlyPayment: 0, interestRate: 0 });
      await loadData();
    } catch (err: any) {
      alert("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Dívida quitada? Parabéns por esse grande passo!")) {
      try {
        if (!firebaseEnabled) {
           alert("Funcionalidade limitada no modo Preview.");
        } else {
          const db = await getDb();
          const { deleteDoc, doc } = await import('firebase/firestore');
          await deleteDoc(doc(db, 'debts', id));
          await loadData();
        }
      } catch (err) {
        alert("Erro ao atualizar plano.");
      }
    }
  };

  const totals = useMemo(() => {
    const total = debts.reduce((acc, d) => acc + parseNumericValue(d.totalAmount), 0);
    const monthly = debts.reduce((acc, d) => acc + parseNumericValue(d.monthlyPayment), 0);
    const months = (monthly + extraPayment) > 0 ? Math.ceil(total / (monthly + extraPayment)) : 0;
    return { total, monthly, months };
  }, [debts, extraPayment]);

  const sortedDebts = useMemo(() => {
    return [...debts].sort((a, b) => {
      if (strategy === 'snowball') return parseNumericValue(a.totalAmount) - parseNumericValue(b.totalAmount);
      return parseNumericValue(b.interestRate) - parseNumericValue(a.interestRate);
    });
  }, [debts, strategy]);

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Luz no fim do túnel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-24">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-4">
            Recomeço <HeartPulse className="text-red-400 animate-pulse" />
          </h2>
          <p className="text-blue-500 font-bold uppercase text-[10px] tracking-widest mt-2">Cuidar do dinheiro é cuidar da sua casa.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white p-5 rounded-[1.5rem] shadow-xl hover:scale-110 transition-all active:scale-95"
        >
          <Plus size={24} />
        </button>
      </header>

      {debts.length > 0 && (
        <div className="bg-white p-8 rounded-[2.5rem] text-blue-900 border-2 border-blue-50 shadow-sm flex items-start gap-5 animate-in fade-in slide-in-from-left duration-700 relative overflow-hidden">
          <div className="bg-blue-600/10 p-3 rounded-2xl shrink-0">
            <Sparkles className="text-blue-600" size={28} />
          </div>
          <p className="text-xl font-bold leading-tight italic opacity-80">"Um passo de cada vez. Recomeçar faz parte da jornada financeira de quem cresce."</p>
        </div>
      )}

      {debts.length === 0 ? (
        <div className="bg-white p-16 rounded-[3rem] text-center border-4 border-dashed border-blue-50 shadow-sm">
          <ShieldCheck size={80} className="mx-auto text-emerald-400 mb-8 opacity-40" />
          <h3 className="text-3xl font-black uppercase text-gray-800 tracking-tighter mb-3">Paz nas Finanças!</h3>
          <p className="text-gray-400 font-bold mb-12 max-w-sm mx-auto uppercase tracking-widest text-xs">Não encontramos dívidas registradas.</p>
          <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl">Registrar Desafio</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border-2 border-blue-50 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] block mb-3">Tudo que devemos hoje</span>
                <div className="text-5xl font-black text-red-500 tracking-tighter">{formatCurrency(totals.total)}</div>
              </div>
              <div className="mt-8 p-5 bg-blue-50 rounded-[1.5rem] flex items-center gap-4">
                <Info size={24} className="text-blue-600" />
                <span className="text-xs font-black text-blue-900 uppercase tracking-tight">Comprometido p/ mês: {formatCurrency(totals.monthly)}</span>
              </div>
            </div>

            <div className="bg-blue-600 p-10 rounded-[3rem] shadow-2xl flex flex-col justify-center text-white relative overflow-hidden">
              <div className="absolute right-[-30px] bottom-[-30px] w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
              <span className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] block mb-3">Liberdade estimada em</span>
              <div className="text-6xl font-black tracking-tighter leading-none">
                {totals.months} <span className="text-sm uppercase font-black opacity-60">meses</span>
              </div>
              <p className="text-[10px] font-black opacity-60 mt-6 uppercase tracking-widest italic border-t border-white/10 pt-6">Com base no pagamento total de {formatCurrency(totals.monthly + extraPayment)}</p>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border-2 border-blue-50 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><RefreshCw size={24} /></div>
              <div>
                <h4 className="font-black uppercase text-gray-900 text-sm leading-none">Acelerar a Paz</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Quanto extra você pode aportar hoje?</p>
              </div>
            </div>
            
            <input 
              type="range" min="0" max="5000" step="100" 
              className="w-full h-4 bg-blue-50 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-6"
              value={extraPayment}
              onChange={e => setExtraPayment(Number(e.target.value))}
            />
            <div className="flex justify-between font-black text-blue-600 text-[10px] uppercase tracking-widest">
              <span>Situação Atual</span>
              <span className="bg-blue-600 text-white px-5 py-2 rounded-full shadow-lg">+ {formatCurrency(extraPayment)} / mês</span>
              <span>Ação Agressiva</span>
            </div>
          </div>

          <div className="grid gap-4">
            {sortedDebts.map((d, i) => (
              <div key={d.id} className="bg-white p-7 rounded-[2.5rem] border-2 border-blue-50 flex items-center justify-between shadow-sm animate-in slide-in-from-bottom">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center font-black text-blue-600 shadow-inner text-xl">{i + 1}</div>
                  <div>
                    <h4 className="font-black uppercase text-gray-900 text-lg leading-none mb-1">{d.name}</h4>
                    <div className="flex gap-3">
                      <span className="text-[9px] font-black text-gray-400 uppercase bg-gray-50 px-2 py-1 rounded-md">Parcela: {formatCurrency(parseNumericValue(d.monthlyPayment))}</span>
                      <span className="text-[9px] font-black text-red-400 uppercase bg-red-50 px-2 py-1 rounded-md">{d.interestRate}% Juros</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <span className="text-[9px] font-black text-gray-300 uppercase block mb-1">Total Devido</span>
                    <div className="text-xl font-black text-red-500 tracking-tighter leading-none">{formatCurrency(parseNumericValue(d.totalAmount))}</div>
                  </div>
                  <button onClick={() => handleDelete(d.id!)} className="p-4 text-gray-200 hover:text-emerald-500 rounded-2xl transition-all"><Trash2 size={24} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-blue-900/60 backdrop-blur-xl z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl p-10">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-3xl font-black uppercase tracking-tighter text-gray-900">Novo Desafio</h3>
              <button onClick={() => setShowModal(false)} className="p-3"><X size={32} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-3 tracking-[0.2em]">Nome da Dívida</label>
                <input required autoFocus type="text" className="w-full text-2xl font-black border-b-4 border-blue-50 pb-3 outline-none focus:border-blue-600" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Cartão de Crédito" />
              </div>
              <div className="grid grid-cols-2 gap-10">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-3">Falta pagar?</label>
                  <input required type="text" className="w-full text-xl font-black border-b-4 border-blue-50 pb-3" value={formData.totalAmount === 0 ? '' : formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-3">Parcela hoje?</label>
                  <input required type="text" className="w-full text-xl font-black border-b-4 border-blue-50 pb-3" value={formData.monthlyPayment === 0 ? '' : formData.monthlyPayment} onChange={e => setFormData({...formData, monthlyPayment: e.target.value})} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black uppercase tracking-widest">Confirmar Desafio</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestartPlan;
