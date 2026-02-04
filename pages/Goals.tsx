
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { getGoals, getAccounts, getCategories } from '../services/db';
import { getDb } from '../services/firestoreClient';
import { firebaseEnabled } from '../lib/firebase';
import { Goal, Account, Category } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { Target, Plus, TrendingUp } from 'lucide-react';

const Goals: React.FC = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAporteModal, setShowAporteModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: 0 as any,
    targetDate: '',
    priority: 3,
    description: ''
  });

  const [aporteForm, setAporteForm] = useState({
    amount: 0 as any,
    accountId: '',
    date: new Date().toISOString().substring(0, 10)
  });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [g, accs, cats] = await Promise.all([
        getGoals(user!.uid),
        getAccounts(user!.uid),
        getCategories(user!.uid)
      ]);
      setGoals(g);
      setAccounts(accs);
      setCategories(cats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!firebaseEnabled) {
      alert("Criação de sonhos limitada no modo Preview.");
    } else {
      const db = await getDb();
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'goals'), {
        ...goalForm,
        targetAmount: parseNumericValue(goalForm.targetAmount),
        userId: user.uid,
        currentAmount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    setShowGoalModal(false);
    loadData();
  };

  const handleAporte = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseNumericValue(aporteForm.amount);
    if (!user || !selectedGoal || amountNum <= 0) return;
    
    try {
      if (!firebaseEnabled) {
        alert("Aportes indisponíveis no modo Preview.");
      } else {
        const db = await getDb();
        const { collection, addDoc, serverTimestamp, updateDoc, doc } = await import('firebase/firestore');
        
        await addDoc(collection(db, 'goalContributions'), {
          userId: user.uid,
          goalId: selectedGoal.id,
          accountId: aporteForm.accountId,
          amount: amountNum,
          date: aporteForm.date,
          createdAt: serverTimestamp()
        });

        const newAmount = (parseNumericValue(selectedGoal.currentAmount) || 0) + amountNum;
        await updateDoc(doc(db, 'goals', selectedGoal.id!), {
          currentAmount: newAmount,
          updatedAt: serverTimestamp()
        });

        const aporteCategory = categories.find(c => c.name.toLowerCase().includes('sonho') || c.name.toLowerCase().includes('aporte'));
        await addDoc(collection(db, 'transactions'), {
          userId: user.uid,
          accountId: aporteForm.accountId,
          categoryId: aporteCategory?.id || '',
          type: 'debit',
          description: `Aporte: ${selectedGoal.name}`,
          amount: amountNum,
          plannedAmount: amountNum,
          competenceMonth: aporteForm.date.substring(0, 7),
          dueDate: aporteForm.date,
          status: 'done',
          isFixed: false,
          recurrence: { enabled: false, pattern: 'none' },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setShowAporteModal(false);
      loadData();
    } catch (err) {
      alert("Erro ao realizar aporte");
    }
  };

  if (loading) return <div className="p-8 text-center font-black uppercase text-blue-600">Localizando seus sonhos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Meus Sonhos</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Objetivos de longo prazo</p>
        </div>
        <button 
          onClick={() => setShowGoalModal(true)}
          className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map(goal => {
          const current = parseNumericValue(goal.currentAmount);
          const target = parseNumericValue(goal.targetAmount);
          const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
          return (
            <div key={goal.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-gray-50 hover:border-blue-200 transition">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Target size={24} />
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                    goal.priority >= 4 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    Prioridade {goal.priority}
                  </span>
                </div>
              </div>
              
              <h3 className="text-xl font-black text-gray-800 uppercase leading-none mb-1">{goal.name}</h3>
              <p className="text-xs text-gray-400 font-bold mb-6">{goal.description}</p>
              
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-xs font-black uppercase">
                  <span className="text-gray-400">Progresso</span>
                  <span className="text-blue-600">{progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-1000" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                  <span>{formatCurrency(current)}</span>
                  <span>Meta: {formatCurrency(target)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="text-[9px] font-black uppercase text-gray-400">
                  Prazo: <span className="text-gray-900">{formatDate(goal.targetDate)}</span>
                </div>
                <button 
                  onClick={() => {
                    setSelectedGoal(goal);
                    setShowAporteModal(true);
                  }}
                  className="flex items-center gap-1 text-xs font-black uppercase text-blue-600 hover:text-blue-800"
                >
                  Fazer Aporte <TrendingUp size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showGoalModal && (
        <div className="fixed inset-0 bg-blue-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-10 animate-in zoom-in">
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-8">Novo Objetivo</h3>
            <form onSubmit={handleCreateGoal} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nome do Sonho</label>
                <input required type="text" value={goalForm.name} onChange={e => setGoalForm({...goalForm, name: e.target.value})} className="w-full border-b-4 border-gray-100 py-3 text-lg font-black outline-none focus:border-blue-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Valor Alvo</label>
                  <input required type="text" value={goalForm.targetAmount === 0 ? '' : goalForm.targetAmount} onChange={e => setGoalForm({...goalForm, targetAmount: e.target.value})} className="w-full border-b-4 border-gray-100 py-3 text-lg font-black outline-none focus:border-blue-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Prazo</label>
                  <input required type="date" value={goalForm.targetDate} onChange={e => setGoalForm({...goalForm, targetDate: e.target.value})} className="w-full border-b-4 border-gray-100 py-3 text-lg font-black outline-none focus:border-blue-600" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowGoalModal(false)} className="flex-1 py-4 font-black uppercase text-gray-400">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-lg">Criar Sonho</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAporteModal && (
        <div className="fixed inset-0 bg-blue-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-10">
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-8">Aporte para: {selectedGoal?.name}</h3>
            <form onSubmit={handleAporte} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Valor do Aporte</label>
                <input required type="text" value={aporteForm.amount === 0 ? '' : aporteForm.amount} onChange={e => setAporteForm({...aporteForm, amount: e.target.value})} className="w-full border-b-4 border-gray-100 py-4 text-3xl font-black outline-none focus:border-blue-600 text-center" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Conta de Origem</label>
                <select required value={aporteForm.accountId} onChange={e => setAporteForm({...aporteForm, accountId: e.target.value})} className="w-full border-b-4 border-gray-100 py-3 font-black bg-transparent">
                  <option value="">Selecione...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-8">
                <button type="button" onClick={() => setShowAporteModal(false)} className="flex-1 py-4 font-black uppercase text-gray-400">Sair</button>
                <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase shadow-lg">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
