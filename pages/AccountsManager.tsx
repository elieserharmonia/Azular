
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { getEntries, deleteEntry, updateAccountEntry } from '../services/db';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import { 
  X, 
  Trash2, 
  CheckCircle2, 
  Search, 
  Filter,
  ArrowDownCircle,
  ArrowUpCircle,
  Repeat
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const AccountsManager: React.FC = () => {
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useToast();
  const [entries, setEntries] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pagar' | 'receber'>('pagar');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) load();
  }, [user]);

  const load = async () => {
    const data = await getEntries(user!.uid);
    setEntries(data);
    setLoading(false);
  };

  const handleMarkAsDone = async (entry: Transaction) => {
    try {
      const newStatus = entry.tipo === 'receber' ? 'recebido' : 'pago';
      await updateAccountEntry(entry.id!, { status: newStatus });
      notifySuccess("Conta baixada com sucesso!");
      load();
    } catch (e) {
      notifyError("Erro ao baixar conta.");
    }
  };

  const filteredEntries = entries
    .filter(e => e.tipo === filter)
    .filter(e => e.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center">
        <h2 className="text-3xl font-black uppercase tracking-tighter">Minhas Contas</h2>
        <div className="flex bg-white p-1.5 rounded-2xl border-2 border-gray-50 shadow-sm">
          <button 
            onClick={() => setFilter('pagar')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filter === 'pagar' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400'}`}
          >
            A Pagar
          </button>
          <button 
            onClick={() => setFilter('receber')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filter === 'receber' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-400'}`}
          >
            A Receber
          </button>
        </div>
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
        {filteredEntries.map(entry => (
          <div key={entry.id} className="bg-white p-5 rounded-[2.5rem] border-2 border-gray-50 shadow-sm flex items-center justify-between group transition-all">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${entry.status === 'pago' || entry.status === 'recebido' ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-50 text-gray-400'}`}>
                {entry.status === 'pago' || entry.status === 'recebido' ? <CheckCircle2 size={24}/> : (entry.tipo === 'receber' ? <ArrowUpCircle size={24}/> : <ArrowDownCircle size={24}/>)}
              </div>
              <div>
                <p className="text-sm font-black text-gray-800 uppercase leading-none flex items-center gap-2">
                  {entry.descricao}
                  {entry.recorrente && <Repeat size={12} className="text-blue-400"/>}
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Vencimento: {entry.vencimento}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-lg font-black tracking-tighter text-gray-900">{formatCurrency(entry.valor)}</p>
              </div>
              
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {entry.status === 'previsto' && (
                  <button 
                    onClick={() => handleMarkAsDone(entry)}
                    className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg active:scale-90 transition-all"
                  >
                    <CheckCircle2 size={18}/>
                  </button>
                )}
                <button 
                  onClick={() => deleteEntry(entry.id!)}
                  className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                >
                  <Trash2 size={18}/>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccountsManager;
