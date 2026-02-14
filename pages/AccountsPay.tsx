
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { getEntries, deleteEntry, updateAccountEntry } from '../services/db';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  ArrowDownCircle, 
  Search, 
  Trash2, 
  CheckCircle2, 
  Calendar,
  AlertCircle,
  ChevronRight,
  Filter
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const AccountsPay: React.FC = () => {
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useToast();
  const [entries, setEntries] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getEntries(user.uid);
      setEntries(data.filter(e => e.tipo === 'pagar' || e.type === 'debit'));
    } catch (err) {
      notifyError("Erro ao carregar contas a pagar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const handleMarkAsDone = async (entry: Transaction) => {
    try {
      await updateAccountEntry(entry.id!, { status: 'pago' });
      notifySuccess("Conta paga com sucesso!");
      load();
    } catch (e) {
      notifyError("Erro ao baixar conta.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja remover este agendamento?")) return;
    try {
      await deleteEntry(id);
      notifySuccess("Conta removida.");
      load();
    } catch (e) {
      notifyError("Erro ao excluir.");
    }
  };

  const filtered = useMemo(() => {
    return entries
      .filter(e => e.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  }, [entries, searchTerm]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] animate-pulse">
      <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
      <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Carregando Contas...</span>
    </div>
  );

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-red-50 text-red-500 rounded-lg">
            <ArrowDownCircle size={20} />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900">Contas a Pagar</h2>
        </div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saídas e compromissos agendados</p>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18}/>
        <input 
          type="text" 
          placeholder="Pesquisar contas..."
          className="w-full bg-white border-2 border-gray-50 p-4 pl-12 rounded-2xl font-bold outline-none focus:border-blue-600 shadow-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filtered.map(entry => (
          <div key={entry.id} className="bg-white p-5 rounded-[2.5rem] border-2 border-gray-50 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${entry.status === 'pago' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                {entry.status === 'pago' ? <CheckCircle2 size={24}/> : <Calendar size={24}/>}
              </div>
              <div>
                <p className="text-sm font-black text-gray-800 uppercase leading-none">{entry.descricao}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatDate(entry.vencimento)}</span>
                  {entry.status !== 'pago' && entry.vencimento < new Date().toISOString().split('T')[0] && (
                    <span className="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase">
                      <AlertCircle size={10} /> Atrasada
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-lg font-black tracking-tighter text-red-500">{formatCurrency(entry.valor)}</p>
              </div>
              <div className="flex gap-1">
                {entry.status !== 'pago' && (
                  <button 
                    onClick={() => handleMarkAsDone(entry)}
                    className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg active:scale-90 transition-all"
                    title="Marcar como Pago"
                  >
                    <CheckCircle2 size={18}/>
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(entry.id!)}
                  className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18}/>
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
            <Filter size={48} />
            <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma conta encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountsPay;
