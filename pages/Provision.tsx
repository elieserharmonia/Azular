
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { 
  getEntries, 
  addAccountPlanEntry, 
  updateAccountPlanSeries, 
  deleteAccountPlanSeries,
  getAccounts 
} from '../services/db';
import { Transaction, Account } from '../types';
import { CATEGORY_GROUPS } from '../constants';
import { formatCurrency, getCurrentMonth, getMonthName, addMonthsToMonthKey } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { useToast } from '../context/ToastContext';
import { 
  ChevronLeft, ChevronRight, Loader2, Plus, Repeat, Trash2, X, ArrowUpCircle, ArrowDownCircle, Info
} from 'lucide-react';
import CategorySelect from '../components/CategorySelect';

const Provision: React.FC = () => {
  const { user } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useToast();
  
  const [entries, setEntries] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'payable' | 'receivable'>('payable');
  const [showModal, setShowModal] = useState(false);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Transaction>>({
    tipo: 'pagar',
    competenceMonth: getCurrentMonth(),
    recorrente: false,
    recurrenceMode: 'none',
    categoryGroup: 'Habitação'
  });

  const [scopeTarget, setScopeTarget] = useState<'update' | 'delete'>('update');

  useEffect(() => {
    if (user) loadData();
  }, [user, selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, accs] = await Promise.all([
        getEntries(user!.uid),
        getAccounts(user!.uid)
      ]);
      setEntries(data);
      setAccounts(accs);
    } catch (err) {
      notifyError("Erro ao carregar plano de contas.");
    } finally {
      setLoading(false);
    }
  };

  const tableMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}`);
  }, [selectedYear]);

  const tableData = useMemo(() => {
    // Filtragem conforme solicitado: status planned ou fixo, separado por tipo debit/credit
    const plannedTxs = entries.filter(t => {
      const isPlanned = t.status === 'planned' || t.status === 'previsto' || t.isFixed;
      if (!isPlanned) return false;
      
      if (viewMode === 'payable') return t.tipo === 'pagar' || t.type === 'debit';
      if (viewMode === 'receivable') return t.tipo === 'receber' || t.type === 'credit';
      
      return true;
    });
    
    const buildGroup = (type: 'pagar' | 'receber') => {
      const typeEntries = plannedTxs.filter(e => e.tipo === type || (type === 'pagar' ? e.type === 'debit' : e.type === 'credit'));
      return CATEGORY_GROUPS.map(group => {
        const groupEntries = typeEntries.filter(e => e.categoryGroup === group);
        const descriptions = Array.from(new Set(groupEntries.map(e => e.descricao)));
        
        const rows = descriptions.map(desc => {
          const values: Record<string, number> = {};
          const originals: Record<string, Transaction | null> = {};
          tableMonths.forEach(m => {
            const item = groupEntries.find(e => e.descricao === desc && e.competenceMonth === m);
            values[m] = item ? item.valor : 0;
            originals[m] = item || null;
          });
          return { desc, values, originals };
        });

        const totals: Record<string, number> = {};
        tableMonths.forEach(m => {
          totals[m] = rows.reduce((sum, r) => sum + r.values[m], 0);
        });

        return { group, rows, totals };
      }).filter(g => g.rows.length > 0);
    };

    const pagarGroups = buildGroup('pagar');
    const receberGroups = buildGroup('receber');

    const monthlySummary: Record<string, { receber: number, pagar: number, saldo: number, acc: number }> = {};
    let runningAcc = 0;
    tableMonths.forEach(m => {
      const r = receberGroups.reduce((acc, g) => acc + g.totals[m], 0);
      const p = pagarGroups.reduce((acc, g) => acc + g.totals[m], 0);
      const s = r - p;
      runningAcc += s;
      monthlySummary[m] = { receber: r, pagar: p, saldo: s, acc: runningAcc };
    });

    return { pagarGroups, receberGroups, monthlySummary };
  }, [entries, tableMonths, viewMode]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      tipo: viewMode === 'payable' ? 'pagar' : 'receber',
      type: viewMode === 'payable' ? 'debit' : 'credit',
      competenceMonth: getCurrentMonth(),
      vencimento: new Date().toISOString().split('T')[0],
      recorrente: false,
      recurrenceMode: 'none',
      categoryGroup: 'Habitação',
      valor: 0,
      descricao: ''
    });
    setShowModal(true);
  };

  const handleEdit = (tx: Transaction) => {
    setEditingItem(tx);
    setFormData({ ...tx });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      setScopeTarget('update');
      setShowScopeModal(true);
      return;
    }

    setIsSaving(true);
    try {
      await addAccountPlanEntry({ ...formData, userId: user!.uid });
      notifySuccess("Conta criada com sucesso!");
      setShowModal(false);
      loadData();
    } catch (err) {
      notifyError("Erro ao salvar conta.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmScopeAction = async (scope: 'current' | 'forward' | 'all') => {
    setIsSaving(true);
    try {
      if (scopeTarget === 'update') {
        await updateAccountPlanSeries(editingItem!, formData, scope);
        notifySuccess("Série atualizada!");
      } else {
        await deleteAccountPlanSeries(editingItem!, scope);
        notifySuccess("Lançamento(s) removido(s)!");
      }
      setShowScopeModal(false);
      setShowModal(false);
      loadData();
    } catch (err) {
      notifyError("Erro ao processar alteração.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900 leading-none">Contas</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Gestão anual de compromissos</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-[1.5rem] shadow-sm border border-blue-50">
          <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-blue-50 rounded-xl"><ChevronLeft size={20}/></button>
          <span className="text-sm font-black text-gray-900">{selectedYear}</span>
          <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-blue-50 rounded-xl"><ChevronRight size={20}/></button>
          
          <button 
            onClick={handleOpenCreate}
            className="ml-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md flex items-center gap-2 hover:bg-blue-700 transition-all"
          >
            <Plus size={14} /> Nova Conta
          </button>
        </div>
      </header>

      {/* Tabs Selector */}
      <div className="flex bg-gray-100 rounded-xl p-1 w-full md:w-max">
        <button
          onClick={() => setViewMode('payable')}
          className={viewMode === 'payable'
            ? 'bg-blue-600 text-white px-8 py-2 rounded-lg text-xs font-black shadow-lg transition-all'
            : 'px-8 py-2 text-xs font-black text-gray-500 hover:text-gray-700 transition-all'}
        >
          A PAGAR
        </button>

        <button
          onClick={() => setViewMode('receivable')}
          className={viewMode === 'receivable'
            ? 'bg-emerald-600 text-white px-8 py-2 rounded-lg text-xs font-black shadow-lg transition-all'
            : 'px-8 py-2 text-xs font-black text-gray-500 hover:text-gray-700 transition-all'}
        >
          A RECEBER
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border-2 border-blue-50 shadow-xl overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          {loading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-blue-600" />
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Organizando sua mesa...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="sticky left-0 z-30 bg-gray-50 px-6 py-5 text-[10px] font-black uppercase text-gray-500 border-r w-[280px]">Grupo / Descritivo</th>
                  {tableMonths.map(m => (
                    <th key={m} className={`px-4 py-5 text-[10px] font-black uppercase text-center ${m === getCurrentMonth() ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
                      {getMonthName(m).split(' de ')[0].substring(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(viewMode === 'payable' ? tableData.pagarGroups : tableData.receberGroups).map(g => (
                  <React.Fragment key={g.group}>
                    <tr className="bg-blue-50/20">
                      <td className="sticky left-0 bg-blue-50 px-6 py-2 text-[10px] font-black text-blue-800 uppercase z-20 border-r">{g.group}</td>
                      {tableMonths.map(m => (
                        <td key={m} className="px-4 py-2 text-center text-[10px] font-black text-blue-600/50 italic">{g.totals[m] > 0 ? formatCurrency(g.totals[m]) : ''}</td>
                      ))}
                    </tr>
                    {g.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="sticky left-0 bg-white px-10 py-3 text-[10px] font-bold text-gray-500 uppercase z-20 border-r truncate">{row.desc}</td>
                        {tableMonths.map(m => (
                          <td 
                            key={m} 
                            onClick={() => row.originals[m] && handleEdit(row.originals[m]!)}
                            className={`px-4 py-3 text-center text-[10px] font-black cursor-pointer transition-all hover:scale-110 ${row.values[m] > 0 ? (viewMode === 'payable' ? 'text-red-500' : 'text-emerald-600') : 'text-gray-200'}`}
                          >
                            <div className="flex flex-col items-center">
                              {row.values[m] > 0 ? formatCurrency(row.values[m]) : '-'}
                              {row.originals[m]?.isRecurring && <Repeat size={8} className="text-blue-300 mt-1"/>}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {/* Resumo Final Integrado */}
                <tr className="bg-gray-100 border-t-2 border-gray-200">
                  <td className="sticky left-0 bg-gray-100 px-6 py-3 text-[10px] font-black uppercase text-gray-400 z-20 border-r">Total a Receber</td>
                  {tableMonths.map(m => (
                    <td key={m} className="px-4 py-3 text-center text-[10px] font-black text-emerald-600">{formatCurrency(tableData.monthlySummary[m].receber)}</td>
                  ))}
                </tr>
                <tr className="bg-gray-100">
                  <td className="sticky left-0 bg-gray-100 px-6 py-3 text-[10px] font-black uppercase text-gray-400 z-20 border-r">Total a Pagar</td>
                  {tableMonths.map(m => (
                    <td key={m} className="px-4 py-3 text-center text-[10px] font-black text-red-500">{formatCurrency(tableData.monthlySummary[m].pagar)}</td>
                  ))}
                </tr>
                <tr className="bg-slate-900 text-white font-black">
                  <td className="sticky left-0 bg-slate-900 px-6 py-5 text-[11px] uppercase z-20 border-r">Acumulado Projetado</td>
                  {tableMonths.map(m => (
                    <td key={m} className={`px-4 py-5 text-center text-[11px] font-black ${tableData.monthlySummary[m].acc >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(tableData.monthlySummary[m].acc)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Principal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8 relative border-2 border-blue-50 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900">
                {editingItem ? 'Editar Lançamento' : (viewMode === 'payable' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber')}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Grupo</label>
                  <select
                    required
                    value={formData.categoryGroup || ''}
                    onChange={e =>
                      setFormData({ ...formData, categoryGroup: e.target.value })
                    }
                    className="w-full font-black border-b-2 border-blue-50 pb-2 bg-transparent outline-none text-sm"
                  >
                    <option value="">Grupo...</option>
                    <option>Habitação</option>
                    <option>Alimentação</option>
                    <option>Transporte</option>
                    <option>Saúde</option>
                    <option>Higiene</option>
                    <option>Educação</option>
                    <option>Lazer</option>
                    <option>Assinaturas</option>
                    <option>Impostos/Taxas</option>
                    <option>Trabalho/Renda</option>
                    <option>Reserva</option>
                    <option>Dívidas</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Categoria Detalhada (Opcional)</label>
                  <CategorySelect 
                    userId={user!.uid}
                    direction={viewMode === 'payable' ? 'debit' : 'credit'}
                    value={formData.categoriaId || ''}
                    onChange={id => setFormData({...formData, categoriaId: id})}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Descrição do Compromisso</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Ex: Aluguel, Salário, Internet..."
                  className="w-full text-xl font-black border-b-2 border-blue-50 pb-2 outline-none focus:border-blue-600 bg-transparent text-gray-900"
                  value={formData.descricao}
                  onChange={e => setFormData({...formData, descricao: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Valor</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="0,00"
                    className="w-full text-2xl font-black border-b-2 border-blue-50 pb-2 outline-none focus:border-blue-600 bg-transparent text-gray-900"
                    value={formData.valor || ''}
                    onChange={e => setFormData({...formData, valor: e.target.value as any})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Mês Inicial</label>
                  <input 
                    required 
                    type="month" 
                    className="w-full text-xl font-black border-b-2 border-blue-50 pb-2 outline-none bg-transparent text-gray-900"
                    value={formData.competenceMonth}
                    onChange={e => setFormData({...formData, competenceMonth: e.target.value})}
                  />
                </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-3xl border-2 border-gray-100 space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Repeat className={formData.recorrente ? 'text-blue-600' : 'text-gray-300'} size={20}/>
                    <span className="text-[10px] font-black uppercase text-gray-600">Repetir Mensalmente?</span>
                  </div>
                  <input 
                    type="checkbox" 
                    className="w-6 h-6 rounded-lg accent-blue-600"
                    checked={formData.recorrente}
                    onChange={e => setFormData({...formData, recorrente: e.target.checked})}
                  />
                </label>

                {formData.recorrente && (
                  <div className="space-y-4 pt-4 border-t border-gray-200 animate-in slide-in-from-top-2">
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, recurrenceMode: 'until'})}
                        className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg border-2 ${formData.recurrenceMode === 'until' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'}`}
                      >
                        Até o Mês
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, recurrenceMode: 'count'})}
                        className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg border-2 ${formData.recurrenceMode === 'count' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'}`}
                      >
                        Por Vezes
                      </button>
                    </div>
                    {formData.recurrenceMode === 'until' && (
                      <input type="month" className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl font-black text-xs text-gray-900" value={formData.recurrenceEndMonth || ''} onChange={e => setFormData({...formData, recurrenceEndMonth: e.target.value})}/>
                    )}
                    {formData.recurrenceMode === 'count' && (
                      <input type="number" className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl font-black text-xs text-gray-900" placeholder="Quantidade de meses" value={formData.recurrenceCount || ''} onChange={e => setFormData({...formData, recurrenceCount: parseInt(e.target.value)})}/>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                {editingItem && (
                  <button 
                    type="button" 
                    onClick={() => { setScopeTarget('delete'); setShowScopeModal(true); }}
                    className="flex-1 py-4 text-red-500 font-black uppercase text-[10px] hover:bg-red-50 rounded-2xl flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16}/> Excluir
                  </button>
                )}
                <button 
                  disabled={isSaving}
                  type="submit" 
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16}/> : (editingItem ? 'Salvar Alteração' : 'Criar Lançamento')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Escopo (Recorrência) */}
      {showScopeModal && (
        <div className="fixed inset-0 bg-blue-900/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-sm shadow-2xl p-10 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Repeat size={32}/>
              </div>
              <h4 className="text-xl font-black uppercase tracking-tighter text-gray-900">Alcance da Operação</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Este item faz parte de uma série recorrente.</p>
            </div>

            <div className="space-y-3">
              <button onClick={() => confirmScopeAction('current')} className="w-full py-4 px-6 bg-gray-50 hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-600 rounded-2xl text-[10px] font-black uppercase text-gray-600 transition-all">Apenas este mês</button>
              <button onClick={() => confirmScopeAction('forward')} className="w-full py-4 px-6 bg-gray-50 hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-600 rounded-2xl text-[10px] font-black uppercase text-gray-600 transition-all">Deste em diante</button>
              <button onClick={() => confirmScopeAction('all')} className="w-full py-4 px-6 bg-gray-50 hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-600 rounded-2xl text-[10px] font-black uppercase text-gray-600 transition-all">Toda a série</button>
            </div>

            <button onClick={() => setShowScopeModal(false)} className="w-full py-2 text-[10px] font-black uppercase text-gray-300">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Provision;
