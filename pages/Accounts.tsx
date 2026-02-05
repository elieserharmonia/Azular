import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { getAccounts } from '../services/db';
import { getDb } from '../services/firestoreClient';
import { firebaseEnabled } from '../lib/firebase';
import { Account } from '../types';
import { formatCurrency } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { Plus, Wallet, CreditCard, TrendingUp, X } from 'lucide-react';

const Accounts: React.FC = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: '',
    kind: 'checking',
    initialBalance: 0,
    hasCreditCard: false,
    creditLimit: 0,
    closingDay: 10,
    isInvestment: false,
    investmentType: 'poupança',
    investedAmount: 0
  });

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    const accs = await getAccounts(user!.uid);
    setAccounts(accs);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!firebaseEnabled) {
      alert("Criação de contas limitada no modo Preview.");
    } else {
      const db = await getDb();
      // Fix: cast dynamic firestore import to any
      const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
      await addDoc(collection(db, 'accounts'), {
        ...formData,
        initialBalance: parseNumericValue(formData.initialBalance),
        creditLimit: parseNumericValue(formData.creditLimit),
        userId: user!.uid,
        active: true,
        createdAt: serverTimestamp()
      });
    }
    setShowModal(false);
    load();
  };

  if (loading) return <div className="p-10 text-center uppercase font-black text-indigo-600">Localizando seu dinheiro...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Minhas Contas</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Onde seu dinheiro está guardado</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition-all"><Plus size={24} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-gray-50 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl ${acc.kind === 'checking' ? 'bg-indigo-50 text-indigo-600' : acc.kind === 'savings' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {acc.isInvestment ? <TrendingUp size={24} /> : <Wallet size={24} />}
              </div>
              <div className="flex gap-2">
                {acc.hasCreditCard && <div className="p-2 bg-gray-100 text-gray-400 rounded-lg"><CreditCard size={16} /></div>}
              </div>
            </div>
            
            <h3 className="text-xl font-black text-gray-800 uppercase leading-none mb-1">{acc.name}</h3>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest block mb-6">{acc.kind === 'checking' ? 'Conta Corrente' : acc.kind === 'savings' ? 'Poupança' : 'Investimento'}</span>
            
            <div className="text-3xl font-black text-indigo-600 tracking-tighter mb-4">{formatCurrency(acc.initialBalance)}</div>
            
            {(acc.hasCreditCard || acc.isInvestment) && (
              <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                {acc.hasCreditCard && (
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Cartão de Crédito</span>
                    <span className="text-xs font-bold text-gray-600">Limite: {formatCurrency(acc.creditLimit || 0)}</span>
                  </div>
                )}
                {acc.isInvestment && (
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Investimento</span>
                    <span className="text-xs font-bold text-gray-600 capitalize">{acc.investmentType}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Cadastrar Conta</h3>
              <button onClick={() => setShowModal(false)}><X size={32} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2">Nome do Banco ou Carteira</label>
                <input required type="text" className="w-full text-2xl font-black border-b-4 border-gray-100 pb-2 outline-none focus:border-indigo-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Nubank" />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2">Tipo de Conta</label>
                  <select className="w-full font-black border-b-4 border-gray-100 pb-2 bg-transparent" value={formData.kind} onChange={e => setFormData({...formData, kind: e.target.value as any})}>
                    <option value="checking">Conta Corrente</option>
                    <option value="savings">Poupança</option>
                    <option value="investment">Investimento</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2">Saldo Atual</label>
                  <input required type="text" className="w-full text-2xl font-black border-b-4 border-gray-100 pb-2 outline-none focus:border-indigo-500" value={formData.initialBalance === 0 ? '' : formData.initialBalance} onChange={e => setFormData({...formData, initialBalance: e.target.value})} />
                </div>
              </div>

              <div className="space-y-6 bg-gray-50 p-6 rounded-3xl border-2 border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase text-xs text-gray-500">Possui Cartão de Crédito?</span>
                  <input type="checkbox" className="w-6 h-6 rounded-lg accent-indigo-600" checked={formData.hasCreditCard} onChange={e => setFormData({...formData, hasCreditCard: e.target.checked})} />
                </div>
                {formData.hasCreditCard && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <input type="text" placeholder="Limite" className="border-b-2 p-2 font-bold outline-none" value={formData.creditLimit === 0 ? '' : formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: e.target.value})} />
                    <input type="number" placeholder="Dia Fechamento" className="border-b-2 p-2 font-bold outline-none" value={formData.closingDay} onChange={e => setFormData({...formData, closingDay: parseInt(e.target.value)})} />
                  </div>
                )}
              </div>

              <div className="space-y-6 bg-indigo-50 p-6 rounded-3xl border-2 border-indigo-100">
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase text-xs text-indigo-500">Esta é uma conta de investimentos?</span>
                  <input type="checkbox" className="w-6 h-6 rounded-lg accent-indigo-600" checked={formData.isInvestment} onChange={e => setFormData({...formData, isInvestment: e.target.checked, kind: e.target.checked ? 'investment' : formData.kind})} />
                </div>
                {formData.isInvestment && (
                  <select className="w-full bg-white p-3 rounded-xl font-bold text-indigo-700 outline-none" value={formData.investmentType} onChange={e => setFormData({...formData, investmentType: e.target.value as any})}>
                    <option value="poupança">Poupança</option>
                    <option value="tesouro">Tesouro Direto</option>
                    <option value="fundo">Fundos de Investimento</option>
                    <option value="outros">Outros</option>
                  </select>
                )}
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl">Salvar Conta</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;