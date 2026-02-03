
import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { getTransactions, getAccounts } from '../services/db';
import { formatCurrency, formatDate, getMonthName } from '../utils/formatters';
import { Printer, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrintReport: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getTransactions(user.uid).then(txs => {
      setData(txs);
      setLoading(false);
    });
  }, [user]);

  const totals = data.reduce((acc, t) => {
    if (t.type === 'credit') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  if (loading) return <div className="p-10 text-center">Preparando relatório de impressão...</div>;

  return (
    <div className="bg-white min-h-screen p-8 text-black">
      <div className="no-print flex justify-between items-center mb-8 border-b pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-indigo-600">
          <ChevronLeft size={20} /> Voltar
        </button>
        <button 
          onClick={() => window.print()}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-bold"
        >
          <Printer size={20} /> Imprimir Agora
        </button>
      </div>

      {/* Report Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Relatório Financeiro</h1>
          <p className="text-gray-600 font-medium">Financeiro Doméstico - {userProfile?.displayName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase text-gray-400">Gerado em</p>
          <p className="font-bold">{new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="border p-4 rounded bg-gray-50">
          <p className="text-[10px] font-bold uppercase text-gray-500">Total Recebido</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totals.income)}</p>
        </div>
        <div className="border p-4 rounded bg-gray-50">
          <p className="text-[10px] font-bold uppercase text-gray-500">Total Pago</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totals.expense)}</p>
        </div>
        <div className="border p-4 rounded bg-gray-50">
          <p className="text-[10px] font-bold uppercase text-gray-500">Saldo Final</p>
          <p className="text-xl font-bold text-black">{formatCurrency(totals.income - totals.expense)}</p>
        </div>
      </div>

      <h2 className="text-lg font-bold mb-4 uppercase border-l-4 border-black pl-3">Lista de Transações</h2>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Data</th>
            <th className="border p-2 text-left">Descrição</th>
            <th className="border p-2 text-left">Tipo</th>
            <th className="border p-2 text-right">Valor</th>
            <th className="border p-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 50).map((t, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border p-2">{formatDate(t.dueDate || t.receiveDate || '')}</td>
              <td className="border p-2 font-medium">{t.description}</td>
              <td className="border p-2">{t.type === 'credit' ? 'Crédito' : 'Débito'}</td>
              <td className={`border p-2 text-right font-bold ${t.type === 'credit' ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatCurrency(t.amount)}
              </td>
              <td className="border p-2 text-center text-[10px] uppercase font-bold">{t.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {data.length > 50 && (
        <p className="text-[10px] text-gray-400 mt-2 italic">* Exibindo apenas as primeiras 50 transações. Para o histórico completo, exporte via CSV.</p>
      )}

      <div className="mt-12 text-center text-[10px] text-gray-400 pt-8 border-t">
        Este documento foi gerado pelo Financeiro Doméstico PWA.
      </div>
    </div>
  );
};

export default PrintReport;
