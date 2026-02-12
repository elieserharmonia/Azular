import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App.tsx';
import { 
  getEntries, 
  addAccountPlanEntry, 
  updateAccountPlanSeries, 
  deleteAccountPlanSeries,
  getAccounts,
  RecurrenceScope 
} from '../services/db.ts';
import { Transaction, Account } from '../types.ts';
import { formatCurrency, getCurrentMonth, getMonthName, addMonthsToMonthKey } from '../utils/formatters.ts';
import { parseNumericValue } from '../utils/number.ts';
import { useToast } from '../context/ToastContext.tsx';
import { 
  ChevronLeft, ChevronRight, Loader2, Plus, Repeat, Trash2, X, ArrowUpCircle, ArrowDownCircle, Calendar, LayoutGrid, List as ListIcon, Info
} from 'lucide-react';

const CATEGORY_DEFAULTS = ['Habitação', 'Alimentação', 'Transporte', 'Saúde', 'Higiene', 'Educação', 'Lazer', 'Assinaturas', 'Impostos/Taxas', 'Trabalho/Renda', 'Reserva', 'Dívidas', 'Outros'];

const Provision: React.FC = () => {
  const { user } = useAuth();
  const { notifySuccess, notifyError, notifyInfo } = useToast();
  
  const [entries, setEntries] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [viewMode, setViewMode] = useState<'receber' | 'pagar'>('pagar');
  const [listLayout, setListLayout] = useState<'list' | 'grid'>('list');
  
  const [showModal, setShowModal] = useState(false);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [scopeTarget, setScopeTarget] = useState<'update' | 'delete'>('update');
  
  const [formData, setFormData] = useState<Partial<Transaction>>({
    tipo: 'pagar',
    competenceMonth: getCurrentMonth(),
    recorrente: false,
    recurrenceMode: 'none',
    categoryGroup: 'Habitação',
    valor: 0,
    descricao: ''
  });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

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
      notifyError("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const monthSummary = useMemo(() => {
    const monthTxs = entries.filter(t => t.competenceMonth === currentMonth && t.status === 'previsto');
    const pagar = monthTxs.filter(t => t.tipo === 'pagar' || t.type === 'debit').reduce((acc, t) => acc + t.valor, 0);
    const receber = monthTxs.filter(t => t.tipo === 'receber' || t.type === 'credit').reduce((acc, t) => acc + t.valor, 0);
    
    const year = currentMonth.substring(0, 4);
    const yearTxs = entries.filter(t => t.competenceMonth.startsWith(year) && t.status === 'previsto');
    const yearAcc = yearTxs.reduce((acc, t) => {
      const isExit = t.tipo === 'pagar' || t.type === 'debit';
      return isExit ? acc - t.valor : acc + t.valor;
    }, 0);

    return { pagar, receber, gap: receber - pagar, yearAcc };
  }, [entries, currentMonth]);

  const filteredItems = useMemo(() => {
    return entries
      .filter(t => t.competenceMonth === currentMonth && t.status === 'previsto')
      .filter(t => viewMode === 'pagar' ? (t.tipo === 'pagar' || t.type === 'debit') : (t.tipo === 'receber' || t.type === 'credit'))
      .sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));
  }, [entries, currentMonth, viewMode]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      tipo: viewMode,
      type: viewMode === 'pagar' ? 'debit' : 'credit',
      competenceMonth: currentMonth,
      vencimento: currentMonth + '-10',
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
    
    // Validações Básicas
    const valorNum = parseNumericValue(formData.valor);
    if (!formData.descricao?.trim()) { notifyInfo("A descrição é obrigatória."); return; }
    if (valorNum <= 0) { notifyInfo("O valor deve ser maior que zero."); return; }
    if (!formData.accountId) { notifyInfo("Selecione uma conta para o lançamento."); return; }
    if (!formData.categoryGroup) { notifyInfo("Selecione uma categoria."); return; }

    // Validações de Recorrência
    if (formData.recorrente) {
      if (!formData.recurrenceMode || formData.recurrenceMode === 'none') {
        notifyInfo("Selecione o modo da recorrência."); return;
      }
      if (formData.recurrenceMode === 'count' && (!formData.recurrenceCount || formData.recurrenceCount < 2)) {
        notifyInfo("Para recorrência, informe ao menos 2 vezes."); return;
      }
      if (formData.recurrenceMode === 'until' && !formData.recurrenceEndMonth) {
        notifyInfo("Informe o mês final da recorrência."); return;
      }
    }

    // Se estiver editando um recorrente antigo, abre modal de escopo
    if (editingItem && (editingItem.recorrente || editingItem.isRecurring)) {
      setScopeTarget('update');
      setShowScopeModal(true);
      return;
    }

    setIsSaving(true);
    try {
      // Cria payload limpo (Sem undefined para não quebrar o Firestore)
      const isRec = !!formData.recorrente;
      const payload: any = {
        userId: user!.uid,
        tipo: formData.tipo || viewMode,
        type: (formData.tipo === 'receber' ? 'credit' : 'debit'),
        descricao: formData.descricao?.trim(),
        valor: valorNum,
        amount: valorNum,
        plannedAmount: valorNum,
        vencimento: formData.vencimento,
        competenceMonth: formData.competenceMonth,
        accountId: formData.accountId,
        categoryGroup: formData.categoryGroup,
        recorrente: isRec,
        isRecurring: isRec,
        status: 'previsto',
        updatedAt: new Date().toISOString()
      };

      if (isRec) {
        payload.recurrenceMode = formData.recurrenceMode;
        payload.recurrenceEndMonth = formData.recurrenceEndMonth || null;
        payload.recurrenceCount = formData.recurrenceCount || null;
      } else {
        payload.recurrenceMode = 'none';
        payload.recurrenceEndMonth = null;
        payload.recurrenceCount = null;
        payload.recurrenceGroupId = null;
      }

      if (editingItem) {
        await updateAccountPlanSeries(editingItem, payload, 'current');
        notifySuccess("Atualizado!");
      } else {
        await addAccountPlanEntry(payload);
        notifySuccess("Lançamento criado!");
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error("[Provision] Erro ao salvar:", err);
      notifyError("Erro ao salvar. Verifique os dados.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmScopeAction = async (scope: RecurrenceScope) => {
    setIsSaving(true);
    try {
      const valorNum = parseNumericValue(formData.valor);
      const isRec = !!formData.recorrente;
      
      const payload: any = {
        descricao: formData.descricao?.trim(),
        valor: valorNum,
        amount: valorNum,
        plannedAmount: valorNum,
        vencimento: formData.vencimento,
        competenceMonth: formData.competenceMonth,
        accountId: formData.accountId,
        categoryGroup: formData.categoryGroup,
        updatedAt: new Date().toISOString()
      };

      if (!isRec) {
        payload.recorrente = false;
        payload.isRecurring = false;
        payload.recurrenceMode = 'none';
        payload.recurrenceEndMonth = null;
        payload.recurrenceCount = null;
        payload.recurrenceGroupId = null;
      }

      if (scopeTarget === 'update') {
        await updateAccountPlanSeries(editingItem!, payload, scope);
        notifySuccess("Série atualizada!");
      } else {
        await deleteAccountPlanSeries(editingItem!, scope);
        notifySuccess("Removido(s)!");
      }
      setShowScopeModal(false);
      setShowModal(false);
      loadData();
    } catch (err) {
      notifyError("Erro na operação em lote.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900 leading-none">Receber & Pagar</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <Calendar size={14} /> Controle de Fluxo Previsto
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-blue-50">
          <button onClick={() => setCurrentMonth(m => addMonthsToMonthKey(m, -1))} className="p-2 hover:bg-blue-50 rounded-xl"><ChevronLeft size={20}/></button>
          <span className="text-sm font-black text-gray-900 min-w-[120px] text-center uppercase">{getMonthName(currentMonth)}</span>
          <button onClick={() => setCurrentMonth(m => addMonthsToMonthKey(m, 1))} className="p-2 hover:bg-blue-50 rounded-xl"><ChevronRight size={20}/></button>
        </div>
      </header>

      {/* Resumo Rápido */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border-2 border-blue-50 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2">A Receber</span>
          <div className="text-2xl font-black text-gray-900 tracking-tighter">{formatCurrency(monthSummary.receber)}</div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border-2 border-blue-50 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-2">A Pagar</span>
          <div className="text-2xl font-black text-gray-900 tracking-tighter">{formatCurrency(monthSummary.pagar)}</div>
        </div>
        <div className={`p-6 rounded-[2rem] border-2 shadow-sm flex flex-col justify-between ${monthSummary.gap >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          <span className="text-[9px] font-black uppercase tracking-widest mb-2">Fôlego do Mês</span>
          <div className="text-2xl font-black tracking-tighter">{formatCurrency(monthSummary.gap)}</div>
        </div>
        <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-xl flex flex-col justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-60">Acumulado {currentMonth.substring(0,4)}</span>
          <div className="text-2xl font-black tracking-tighter">{formatCurrency(monthSummary.yearAcc)}</div>
        </div>
      </section>

      {/* Filtros e Layout */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex bg-gray-100 rounded-xl p-1 w-full sm:w-auto">
          <button 
            onClick={() => setViewMode('receber')} 
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'receber' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400'}`}
          >
            Receber
          </button>
          <button 
            onClick={() => setViewMode('pagar')} 
            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'pagar' ? 'bg-white text-red-500 shadow-md' : 'text-gray-400'}`}
          >
            Pagar
          </button>
        </div>

        <div className="flex gap-2">
           <button onClick={() => setListLayout('list')} className={`p-3 rounded-xl ${listLayout === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-300'}`}><ListIcon size={18}/></button>
           <button onClick={() => setListLayout('grid')} className={`p-3 rounded-xl ${listLayout === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-300'}`}><LayoutGrid size={18}/></button>
        </div>
      </div>

      {/* Lista de Itens */}
      <section className={listLayout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
        {filteredItems.map(item => (
          <div 
            key={item.id} 
            onClick={() => handleEdit(item)}
            className="bg-white p-5 rounded-[2rem] border-2 border-gray-50 flex items-center justify-between shadow-sm hover:border-blue-200 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${viewMode === 'receber' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                {viewMode === 'receber' ? <ArrowUpCircle size={22}/> : <ArrowDownCircle size={22}/>}
              </div>
              <div>
                <h4 className="font-black text-gray-800 text-sm uppercase leading-none flex items-center gap-2">
                  {item.descricao}
                  {(item.recorrente || item.isRecurring) && <Repeat size={12} className="text-blue-400"/>}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{item.categoryGroup}</span>
                  <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{accounts.find(a => a.id === item.accountId)?.name || 'S/ Conta'}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-lg font-black tracking-tighter ${viewMode === 'receber' ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(item.valor)}</p>
              <span className="text-[8px] font-black text-gray-300 uppercase">venc. {item.vencimento?.split('-')[2] || '--'}</span>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center gap-4 border-2 border-dashed border-gray-100 rounded-[3rem] col-span-full">
            <Info size={40} className="text-gray-200"/>
            <p className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Nada previsto para este mês em {viewMode}.</p>
            <button onClick={handleOpenCreate} className="text-blue-600 font-black uppercase text-[10px]">Lançar agora</button>
          </div>
        )}
      </section>

      {/* Floating Action Button */}
      <button 
        onClick={handleOpenCreate}
        className="fixed bottom-28 right-6 md:right-10 w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
      >
        <Plus size={32} />
      </button>

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8 relative border-2 border-blue-50 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900">
                {editingItem ? 'Ajustar Previsto' : `Lançar ${viewMode}`}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24}/></button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex p-2 bg-gray-50 rounded-2xl">
                 <button type="button" onClick={() => setFormData({...formData, tipo: 'receber', type: 'credit'})} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${formData.tipo === 'receber' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Entrada</button>
                 <button type="button" onClick={() => setFormData({...formData, tipo: 'pagar', type: 'debit'})} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${formData.tipo === 'pagar' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>Saída</button>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Descrição</label>
                <input required type="text" className="w-full text-xl font-black border-b-2 border-blue-50 pb-2 outline-none focus:border-blue-600" value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} placeholder="Aluguel, Salário, etc..."/>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Valor Previsto</label>
                  <input required type="text" className="w-full text-2xl font-black border-b-2 border-blue-50 pb-2 outline-none focus:border-blue-600" value={formData.valor || ''} onChange={e => setFormData({...formData, valor: e.target.value as any})} placeholder="0,00"/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Data Vencimento</label>
                  <input required type="date" className="w-full text-lg font-black border-b-2 border-blue-50 pb-2 outline-none" value={formData.vencimento} onChange={e => setFormData({...formData, vencimento: e.target.value, competenceMonth: e.target.value.substring(0, 7)})}/>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Grupo / Categoria</label>
                  <select required value={formData.categoryGroup} onChange={e => setFormData({...formData, categoryGroup: e.target.value})} className="w-full font-black border-b-2 border-blue-50 pb-2 bg-transparent text-sm">
                    {CATEGORY_DEFAULTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Conta / Carteira</label>
                  <select required value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} className="w-full font-black border-b-2 border-blue-50 pb-2 bg-transparent text-sm">
                    <option value="">Onde movimentará?</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-[2rem] border-2 border-gray-100 space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[10px] font-black uppercase text-gray-500">Repetir Mensalmente?</span>
                  <input type="checkbox" className="w-6 h-6 rounded-lg accent-blue-600" checked={!!formData.recorrente} onChange={e => setFormData({...formData, recorrente: e.target.checked, recurrenceMode: e.target.checked ? 'until' : 'none'})}/>
                </label>

                {formData.recorrente && (
                  <div className="space-y-4 pt-4 border-t border-gray-200 animate-in slide-in-from-top-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setFormData({...formData, recurrenceMode: 'until'})} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg border-2 ${formData.recurrenceMode === 'until' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'}`}>Até o Mês</button>
                      <button type="button" onClick={() => setFormData({...formData, recurrenceMode: 'count'})} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg border-2 ${formData.recurrenceMode === 'count' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'}`}>Por X Vezes</button>
                    </div>
                    {formData.recurrenceMode === 'until' && <input type="month" className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl font-black text-xs" value={formData.recurrenceEndMonth || ''} onChange={e => setFormData({...formData, recurrenceEndMonth: e.target.value})}/>}
                    {formData.recurrenceMode === 'count' && <input type="number" className="w-full p-3 bg-white border-2 border-gray-100 rounded-xl font-black text-xs" placeholder="Qtd. de meses" value={formData.recurrenceCount || ''} onChange={e => setFormData({...formData, recurrenceCount: parseInt(e.target.value)})}/>}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                 {editingItem && (
                   <button type="button" onClick={() => { setScopeTarget('delete'); setShowScopeModal(true); }} className="flex-1 py-4 text-red-500 font-black uppercase text-[10px] hover:bg-red-50 rounded-2xl flex items-center justify-center gap-2"><Trash2 size={16}/> Apagar</button>
                 )}
                 <button disabled={isSaving} type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2">
                   {isSaving ? <Loader2 className="animate-spin" size={16}/> : (editingItem ? 'Atualizar' : 'Salvar')}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Escopo (Recorrência) */}
      {showScopeModal && (
        <div className="fixed inset-0 bg-blue-900/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-sm shadow-2xl p-10 space-y-6 animate-in zoom-in">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Repeat size={32}/>
              </div>
              <h4 className="text-xl font-black uppercase tracking-tighter text-gray-900">Aplicar em Lote</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Este item faz parte de uma recorrência.</p>
            </div>

            <div className="space-y-3">
              <button onClick={() => confirmScopeAction('current')} className="w-full py-4 px-6 bg-gray-50 hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-600 rounded-2xl text-[10px] font-black uppercase text-gray-600 transition-all">Somente este mês</button>
              <button onClick={() => confirmScopeAction('forward')} className="w-full py-4 px-6 bg-gray-50 hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-600 rounded-2xl text-[10px] font-black uppercase text-gray-600 transition-all">Deste em diante</button>
              <button onClick={() => confirmScopeAction('backward')} className="w-full py-4 px-6 bg-gray-50 hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-600 rounded-2xl text-[10px] font-black uppercase text-gray-600 transition-all">Meses anteriores (até este)</button>
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