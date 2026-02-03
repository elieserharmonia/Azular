
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { getTransactions, getAccounts, getCategories } from '../services/db';
import { Transaction, Account, Category } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { FileDown, Printer, Lock, Play } from 'lucide-react';
import { adService } from '../services/adService';
import RewardedAdModal from '../components/RewardedAdModal';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdModal, setShowAdModal] = useState(false);
  const [hasPdfBenefit, setHasPdfBenefit] = useState(adService.hasBenefit('PDF_EXPORT'));
  
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [txs, accs, cats] = await Promise.all([
      getTransactions(user!.uid),
      getAccounts(user!.uid),
      getCategories(user!.uid)
    ]);
    setTransactions(txs);
    setAccounts(accs);
    setCategories(cats);
    setLoading(false);
  };

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterAccount !== 'all' && t.accountId !== filterAccount) return false;
    if (filterMonth && t.competenceMonth !== filterMonth) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ['Descrição', 'Tipo', 'Valor', 'Conta', 'Categoria', 'Data', 'Status'];
    const rows = filtered.map(t => [
      t.description,
      t.type === 'credit' ? 'Crédito' : 'Débito',
      t.amount.toString(),
      accounts.find(a => a.id === t.accountId)?.name || '-',
      categories.find(c => c.id === t.categoryId)?.name || '-',
      t.dueDate || t.receiveDate || '-',
      t.status
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAdComplete = () => {
    adService.grantBenefit('PDF_EXPORT');
    setHasPdfBenefit(true);
    setShowAdModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Relatórios</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filtre e exporte seus dados</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-6 py-4 bg-white border-2 border-blue-50 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 shadow-sm transition-all"
          >
            <FileDown size={18} /> CSV
          </button>
          
          {hasPdfBenefit ? (
            <button 
              onClick={() => navigate('/print')}
              className="flex items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl transition-all active:scale-95"
            >
              <Printer size={18} /> Imprimir PDF
            </button>
          ) : (
            <button 
              onClick={() => setShowAdModal(true)}
              className="flex items-center gap-3 px-6 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all group"
            >
              <Lock size={16} className="text-amber-400 group-hover:scale-110 transition-transform" /> 
              <span>PDF <span className="opacity-50">•</span> Assistir Apoio</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-blue-50 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <label className="block text-[8px] font-black text-gray-400 uppercase mb-2 tracking-widest">Tipo de Fluxo</label>
          <select 
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="w-full border-b-2 border-gray-100 p-2 text-sm font-black uppercase outline-none focus:border-blue-600"
          >
            <option value="all">Todos</option>
            <option value="credit">Entradas</option>
            <option value="debit">Saídas</option>
          </select>
        </div>
        <div>
          <label className="block text-[8px] font-black text-gray-400 uppercase mb-2 tracking-widest">Qual Conta?</label>
          <select 
            value={filterAccount}
            onChange={e => setFilterAccount(e.target.value)}
            className="w-full border-b-2 border-gray-100 p-2 text-sm font-black uppercase outline-none focus:border-blue-600"
          >
            <option value="all">Todas</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[8px] font-black text-gray-400 uppercase mb-2 tracking-widest">Mês Específico</label>
          <input 
            type="month" 
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="w-full border-b-2 border-gray-100 p-2 text-sm font-black uppercase outline-none focus:border-blue-600"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-blue-50 overflow-hidden mb-20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-gray-400 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-8 py-4">Descrição</th>
                <th className="px-8 py-4">Data</th>
                <th className="px-8 py-4">Conta</th>
                <th className="px-8 py-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-8 py-5 font-black text-gray-900 uppercase">{t.description}</td>
                  <td className="px-8 py-5 text-gray-400 font-bold">{formatDate(t.dueDate || t.receiveDate || '')}</td>
                  <td className="px-8 py-5 text-gray-400 font-black uppercase text-[10px]">{accounts.find(a => a.id === t.accountId)?.name}</td>
                  <td className={`px-8 py-5 text-right font-black ${t.type === 'credit' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="p-20 text-center text-[10px] font-black uppercase text-gray-300 tracking-widest">Nenhum dado encontrado...</div>}
      </div>

      {showAdModal && (
        <RewardedAdModal 
          benefitName="Exportação PDF"
          onComplete={handleAdComplete}
          onCancel={() => setShowAdModal(false)}
        />
      )}
    </div>
  );
};

export default Reports;
