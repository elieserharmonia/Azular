import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { getAccounts, addAccount, updateAccount, deleteAccount } from '../services/db';
import { Account } from '../types';
import { formatCurrency } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { Plus, Wallet, CreditCard, TrendingUp, X, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const INITIAL_FORM = {
  name: '',
  kind: 'checking' as const,
  initialBalance: 0,
  hasCreditCard: false,
  creditLimit: 0,
  closingDay: 10,
  isInvestment: false,
  investmentType: 'poupança' as const,
  investedAmount: 0
};

const Accounts: React.FC = () => {
  const { user } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState<any>(INITIAL_FORM);

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      const accs = await getAccounts(user!.uid);
      setAccounts(accs);
    } catch (err) {
      notifyError("Erro ao carregar contas.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setFormData(INITIAL_FORM);
    setShowModal(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setFormData({
      name: acc.name,
      kind: acc.kind,
      initialBalance: acc.initialBalance,
      hasCreditCard: acc.hasCreditCard,
      creditLimit: acc.creditLimit || 0,
      closingDay: acc.closingDay || 10,
      isInvestment: acc.isInvestment,
      investmentType: acc.investmentType || 'poupança',
      investedAmount: acc.investedAmount || 0
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isProcessing) return;

    setIsProcessing(true);
    try {
      const payload = {
        ...formData,
        initialBalance: parseNumericValue(formData.initialBalance),
        creditLimit: parseNumericValue(formData.creditLimit),
        investedAmount: parseNumericValue(formData.investedAmount),
        userId: user.uid,
        active: true
      };

      if (editingAccount?.id) {
        await updateAccount(editingAccount.id, payload);
        notifySuccess("Conta atualizada!");
      } else {
        await addAccount(payload);
        notifySuccess("Conta cadastrada!");
      }
      
      setShowModal(false);
      load();
    } catch (err) {
      notifyError("Erro ao salvar conta.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!editingAccount?.id) return;
    if (!window.confirm(`Deseja realmente excluir a conta "${editingAccount.name}"? Esta ação não pode ser desfeita.`)) return;

    setIsProcessing(true);
    try {
      await deleteAccount(editingAccount.id);
      notifySuccess("Conta removida com sucesso.");
      setShowModal(false);
      load();
    } catch (err) {
      notifyError("Erro ao excluir conta.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-10 text-center uppercase font-black text-indigo-600 animate-pulse">Localizando seu dinheiro...</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Minhas Contas</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">Onde seu dinheiro está guardado</p>
        </div>
        <button 
          onClick={handleOpenCreate} 
          className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition-all active:scale-95"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts.map(acc => (
          <div 
            key={acc.id} 
            onClick={() => handleOpenEdit(acc)}
            className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border-2 border-gray-50 dark:border-slate-800 relative overflow-hidden group cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-900 transition-all"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl ${acc.kind === 'checking' ? 'bg-indigo-50 text-indigo-600' : acc.kind === 'savings' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {acc.isInvestment ? <TrendingUp size={24} /> : <Wallet size={24} />}
              </div>
              <div className="flex gap-2">
                <div className="p-2 text-gray-300 group-hover:text-indigo-600 transition-colors">
                  <Pencil size={18} />
                </div>
                {acc.hasCreditCard && <div className="p-2 bg-gray-100 dark:bg-slate-800 text-gray-400 rounded-lg"><CreditCard size={16} /></div>}
              </div>
            </div>
            
            <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase leading-none mb-1">{acc.name}</h3>
            <span className="text-[10px] font-black text-gray-300 dark:text-slate-500 uppercase tracking-widest block mb-6">
              {acc.isInvestment ? 'Investimento' : acc.kind === 'checking' ? 'Conta Corrente' : 'Poupança'}
            </span>
            
            <div className="text-3xl font-black text-indigo-600 tracking-tighter mb-4">
              {formatCurrency(parseNumericValue(acc.initialBalance))}
            </div>
            
            {(acc.hasCreditCard || acc.isInvestment) && (
              <div className="pt-4 border-t border-gray-50 dark:border-slate-800 grid grid-cols-2 gap-4">
                {acc.hasCreditCard && (
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Cartão de Crédito</span>
                    <span className="text-xs font-bold text-gray-600 dark:text-slate-400">Limite: {formatCurrency(acc.creditLimit || 0)}</span>
                  </div>
                )}
                {acc.isInvestment && (
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Categoria</span>
                    <span className="text-xs font-bold text-gray-600 dark:text-slate-400 capitalize">{acc.investmentType}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {accounts.length === 0 && (
          <div className="col-span-full py-20 bg-white dark:bg-slate-900 rounded-[3rem] border-4 border-dashed border-gray-50 dark:border-slate-800 text-center flex flex-col items-center gap-4">
            <AlertCircle size={48} className="text-gray-200" />
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Nenhuma conta cadastrada.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-xl shadow-2xl p-10 max-h-[90vh] overflow-y-auto animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter dark:text-white">
                {editingAccount ? 'Editar Conta' : 'Cadastrar Conta'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors dark:text-white">
                <X size={32} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Nome da Conta ou Carteira</label>
                <input required autoFocus type="text" className="w-full text-2xl font-black border-b-4 border-gray-100 dark:border-slate-800 pb-2 outline-none focus:border-indigo-500 transition-all dark:text-white bg-transparent" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Nubank, Dinheiro..." />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2">Tipo de Conta</label>
                  <select className="w-full font-black border-b-4 border-gray-100 dark:border-slate-800 pb-2 bg-transparent dark:text-white" value={formData.kind} onChange={e => setFormData({...formData, kind: e.target.value as any})}>
                    <option value="checking">Conta Corrente</option>
                    <option value="savings">Poupança</option>
                    <option value="investment">Investimento</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 block mb-2">Saldo Atual</label>
                  <input required type="text" className="w-full text-2xl font-black border-b-4 border-gray-100 dark:border-slate-800 pb-2 outline-none focus:border-indigo-500 dark:text-white bg-transparent" value={formData.initialBalance === 0 ? '' : formData.initialBalance} onChange={e => setFormData({...formData, initialBalance: e.target.value})} />
                </div>
              </div>

              <div className="space-y-6 bg-gray-50 dark:bg-slate-800/50 p-6 rounded-3xl border-2 border-gray-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase text-[10px] text-gray-500 tracking-widest">Possui Cartão de Crédito?</span>
                  <input type="checkbox" className="w-6 h-6 rounded-lg accent-indigo-600" checked={formData.hasCreditCard} onChange={e => setFormData({...formData, hasCreditCard: e.target.checked})} />
                </div>
                {formData.hasCreditCard && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <input type="text" placeholder="Limite" className="border-b-2 p-2 font-bold outline-none bg-transparent dark:text-white dark:border-slate-700" value={formData.creditLimit === 0 ? '' : formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: e.target.value})} />
                    <input type="number" placeholder="Dia Fechamento" className="border-b-2 p-2 font-bold outline-none bg-transparent dark:text-white dark:border-slate-700" value={formData.closingDay} onChange={e => setFormData({...formData, closingDay: parseInt(e.target.value)})} />
                  </div>
                )}
              </div>

              <div className="space-y-6 bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-center justify-between">
                  <span className="font-black uppercase text-[10px] text-indigo-500 tracking-widest">É uma conta de investimentos?</span>
                  <input type="checkbox" className="w-6 h-6 rounded-lg accent-indigo-600" checked={formData.isInvestment} onChange={e => setFormData({...formData, isInvestment: e.target.checked, kind: e.target.checked ? 'investment' : formData.kind})} />
                </div>
                {formData.isInvestment && (
                  <select className="w-full bg-white dark:bg-slate-800 p-3 rounded-xl font-bold text-indigo-700 dark:text-indigo-400 outline-none" value={formData.investmentType} onChange={e => setFormData({...formData, investmentType: e.target.value as any})}>
                    <option value="poupança">Poupança</option>
                    <option value="tesouro">Tesouro Direto</option>
                    <option value="fundo">Fundos de Investimento</option>
                    <option value="outros">Outros</option>
                  </select>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  disabled={isProcessing}
                  type="submit" 
                  className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all text-sm"
                >
                  {isProcessing ? 'Processando...' : (editingAccount ? 'Salvar Alterações' : 'Cadastrar Conta')}
                </button>

                {editingAccount && (
                  <button 
                    disabled={isProcessing}
                    type="button"
                    onClick={handleDelete}
                    className="w-full py-4 text-red-500 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all"
                  >
                    <Trash2 size={16} /> Excluir Conta
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;