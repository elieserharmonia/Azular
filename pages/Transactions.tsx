import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { useLocation } from 'react-router-dom';
import { dbClient } from '../services/dbClient';
import { Transaction, Account, Category } from '../types';
import { formatCurrency, formatDate, getCurrentMonth, getTodayDate } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { useToast } from '../context/ToastContext';
import { Plus, Search, CheckCircle, X, RefreshCw, Loader2, Sparkles } from 'lucide-react';
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

const Transactions: React.FC = () => {
  const { user } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useToast();
  const location = useLocation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [formData, setFormData] = useState<Partial<Transaction>>(INITIAL_FORM_STATE());
  const [isProcessing, setIsProcessing] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [foundProvision, setFoundProvision] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
    if (location.state?.openModal) {
      setFormData(INITIAL_FORM_STATE());
      setShowModal(true);
    }
  }, [user, location]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txs, accs] = await Promise.all([
        dbClient.getTransactions(user!.uid),
        dbClient.getAccounts(user!.uid)
      ]);
      setTransactions(txs);
      setAccounts(accs);
    } catch (e) {
        notifyError("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormData(tx);
    setShowModal(true);
    setCategoryError('');
  };

  useEffect(() => {
    if (!formData.description || formData.description.length < 3 || editingTx) {
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
  }, [formData.description, formData.type, formData.competenceMonth, transactions, editingTx]);

  const handleSubmit = async (e: React.FormEvent) => {
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

      if (editingTx) {
        await dbClient.updateTransaction(editingTx.id!, updatedData);
        notifySuccess("Registro atualizado.");
      } else {
        await dbClient.addTransaction(updatedData);
        notifySuccess("Lançamento concluído.");
      }
      closeAllModals();
      loadData();
    } catch (err) {
      notifyError("Erro ao salvar lançamento.");
    } finally {
      setIsProcessing(false);
    }
  };

  const closeAllModals = () => {
    setShowModal(false);
    setEditingTx(null);
    setFormData(INITIAL_FORM_STATE());
    setCategoryError('');
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => t.status === 'done')
      .filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => (b.receiveDate || b.dueDate || '').localeCompare(a.receiveDate || a.dueDate || ''));
  }, [transactions, searchTerm]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase text-gray-900 leading-none">Lançamentos</h2>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-500" /> Histórico Financeiro
          </p>
        </div>
        <button 
          onClick={() => { setFormData(INITIAL_FORM_STATE()); setEditingTx(null); setShowModal(true); }}
          className="bg-emerald-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 hover:scale-105 transition-all"
        >
          <Plus size={24} /> Registrar
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Pesquisar lançamentos..." 
          className="w-full pl-12 pr-6 py-5 rounded-3xl border-2 border-blue-50 font-bold outline-none focus:border-blue-600 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4 pb-20">
        {loading ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></div> : filteredTransactions.map(tx => (
          <div key={tx.id} onClick={() => handleOpenEdit(tx)} className="bg-white p-6 rounded-[2.5rem] border-2 border-blue-50 flex items-center justify-between shadow-sm hover:border-blue-200 transition-all cursor-pointer group">
            <div className="flex items-center gap-5">
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle size={24} />
              </div>
              <div>
                <h4 className="font-black text-gray-800 text-lg uppercase leading-none">{tx.description}</h4>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 block">
                  {accounts.find(a => a.id === tx.accountId)?.name} • {formatDate(tx.dueDate || tx.receiveDate || '')}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-black ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-500'} tracking-tighter`}>
                {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-blue-900/20 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl p-10 max-h-[90vh] overflow-y-auto relative border-2 border-blue-50">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Lançar Real</h3>
              <button onClick={closeAllModals} className="p-2 hover:bg-gray-100 rounded-full"><X size={32} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex p-2 bg-blue-50 rounded-[1.5rem]">
                <button type="button" onClick={() => setFormData({...formData, type: 'credit'})} className={`flex-1 py-4 font-black uppercase rounded-[1.2rem] transition-all ${formData.type === 'credit' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400'}`}>Recebido</button>
                <button type="button" onClick={() => setFormData({...formData, type: 'debit'})} className={`flex-1 py-4 font-black uppercase rounded-[1.2rem] transition-all ${formData.type === 'debit' ? 'bg-white text-red-500 shadow-md' : 'text-gray-400'}`}>Pago</button>
              </div>

              <div>
                <input required autoFocus type="text" className="w-full text-2xl font-black border-b-4 border-blue-50 pb-2 outline-none focus:border-blue-600 transition-all" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descrição" />
                {foundProvision && (
                  <div className="mt-2 bg-emerald-50 p-4 rounded-2xl flex items-center gap-3">
                    <Sparkles className="text-emerald-600" size={18} />
                    <p className="text-[10px] font-black uppercase text-emerald-800 tracking-tight">Localizamos sua previsão!</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8">
                <input required type="text" className="w-full text-3xl font-black border-b-4 border-emerald-100 pb-2 outline-none" value={formData.amount === 0 ? '' : (formData.amount || '')} onChange={e => setFormData({...formData, amount: e.target.value as any})} placeholder="0,00" />
                <input required type="date" className="w-full text-xl font-black border-b-4 border-blue-50 pb-2 outline-none" value={(formData.type === 'credit' ? formData.receiveDate : formData.dueDate) || ''} onChange={e => setFormData({...formData, [formData.type === 'credit' ? 'receiveDate' : 'dueDate']: e.target.value, competenceMonth: e.target.value.substring(0, 7)})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <select required className="w-full font-black border-b-4 border-blue-50 pb-2 bg-transparent outline-none" value={formData.accountId || ''} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                  <option value="">Conta</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <CategorySelect userId={user!.uid} value={formData.categoryId || ''} direction={formData.type || 'debit'} onChange={(id) => setFormData({...formData, categoryId: id})} />
              </div>

              <button disabled={isProcessing} type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
                {isProcessing ? 'Salvando...' : (editingTx ? 'Salvar Mudanças' : 'Confirmar Lançamento')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;