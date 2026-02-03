
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { getTransactions, getAccounts, getCategories } from '../services/db';
import { Transaction, Account, Category } from '../types';
import { formatCurrency, formatDate, getMonthName } from '../utils/formatters';
import { FileDown, Printer, Filter } from 'lucide-react';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Relatórios Detalhados</h2>
          <p className="text-gray-500">Filtre e exporte seus dados</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-semibold hover:bg-gray-50 shadow-sm"
          >
            <FileDown size={18} /> CSV
          </button>
          <button 
            onClick={() => navigate('/print')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm"
          >
            <Printer size={18} /> Imprimir PDF
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo</label>
          <select 
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos os tipos</option>
            <option value="credit">Créditos</option>
            <option value="debit">Débitos</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Conta</label>
          <select 
            value={filterAccount}
            onChange={e => setFilterAccount(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todas as contas</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Mês</label>
          <input 
            type="month" 
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Conta</th>
                <th className="px-6 py-3">Categoria</th>
                <th className="px-6 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{t.description}</td>
                  <td className="px-6 py-4">{formatDate(t.dueDate || t.receiveDate || '')}</td>
                  <td className="px-6 py-4 text-gray-500">{accounts.find(a => a.id === t.accountId)?.name}</td>
                  <td className="px-6 py-4 text-gray-500">{categories.find(c => c.id === t.categoryId)?.name}</td>
                  <td className={`px-6 py-4 text-right font-bold ${t.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="p-8 text-center text-gray-400">Nenhum dado com os filtros atuais.</div>}
      </div>
    </div>
  );
};

export default Reports;
