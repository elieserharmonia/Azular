
import { firebaseEnabled } from '../lib/firebase.ts';
import { dbClient } from './dbClient.ts';
import { Transaction, TransactionStatus, TransactionType } from '../types.ts';
import { addMonthsToMonthKey, getCurrentMonth } from '../utils/formatters.ts';
import { parseNumericValue } from '../utils/number.ts';

const RECURRENCE_WINDOW = 12;

export type RecurrenceScope = 'current' | 'forward' | 'backward' | 'all' | 'range';

/**
 * SANITIZER: Normaliza uma transação garantindo integridade dos dados.
 */
export const normalizeTransaction = (t: any): Transaction => {
  const amount = parseNumericValue(t.amount || t.valor || 0);
  const plannedAmount = parseNumericValue(t.plannedAmount ?? t.amount ?? t.valor ?? 0);
  
  const rawDate = t.vencimento || t.dueDate || t.receiveDate;
  if (!rawDate && !t.competenceMonth) {
    throw new Error("Registro sem data válida para competência.");
  }

  const vencimento = rawDate || new Date().toISOString().split('T')[0];
  const competence = t.competenceMonth || (vencimento ? vencimento.substring(0, 7) : getCurrentMonth());

  const validTypes: TransactionType[] = ['pagar', 'receber', 'credit', 'debit'];
  const tipo = validTypes.includes(t.tipo) ? t.tipo : (t.type || 'pagar');
  
  // Mapeamento planned -> previsto para compatibilidade
  let status = t.status;
  if (status === 'planned') status = 'previsto';
  if (status === 'done') status = tipo === 'receber' ? 'recebido' : 'pago';
  
  const validStatus: TransactionStatus[] = ['previsto', 'pago', 'recebido', 'atrasado', 'cancelado'];
  const finalStatus = validStatus.includes(status) ? status : 'previsto';

  return {
    ...t,
    id: t.id,
    userId: t.userId || '',
    tipo: tipo as TransactionType,
    type: (t.type || (tipo === 'receber' ? 'credit' : 'debit')) as TransactionType,
    descricao: t.descricao || t.description || 'Sem descrição',
    description: t.description || t.descricao || 'Sem descrição',
    valor: amount,
    amount: amount,
    plannedAmount: plannedAmount,
    vencimento: vencimento,
    dueDate: t.dueDate || vencimento,
    receiveDate: t.receiveDate || (tipo === 'receber' ? vencimento : undefined),
    competenceMonth: competence,
    status: finalStatus as TransactionStatus,
    categoryGroup: t.categoryGroup || 'Outros',
    accountId: t.accountId || '',
    recorrente: !!(t.recorrente || t.isRecurring),
    isRecurring: !!(t.isRecurring || t.recorrente),
    recurrenceGroupId: t.recurrenceGroupId || undefined,
    isFixed: !!t.isFixed,
    updatedAt: t.updatedAt || new Date().toISOString()
  };
};

export const getEntries = async (userId: string): Promise<Transaction[]> => {
  try {
    const data = await dbClient.getTransactions(userId);
    if (!Array.isArray(data)) return [];
    
    return data.map(t => {
      try {
        return normalizeTransaction(t);
      } catch (err) {
        console.warn("[DB Sanitizer] Ignorando registro corrompido:", t?.id, err);
        return null;
      }
    }).filter((t): t is Transaction => t !== null);
  } catch (err) {
    console.error("[DB] Falha crítica no carregamento de transações:", err);
    return [];
  }
};

export const addAccountPlanEntry = async (data: Partial<Transaction>) => {
  try {
    const entries: Partial<Transaction>[] = [];
    const recurrenceGroupId = data.recorrente ? `rg-${Math.random().toString(36).substr(2, 9)}` : undefined;
    
    const baseEntry = {
      ...data,
      recurrenceGroupId,
      isRecurring: data.recorrente,
      status: 'previsto' as TransactionStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    entries.push(baseEntry);

    if (data.recorrente) {
      let monthsToCreate = 0;
      if (data.recurrenceMode === 'count') {
        monthsToCreate = (data.recurrenceCount || 1) - 1;
      } else if (data.recurrenceMode === 'until' && data.recurrenceEndMonth) {
        const start = new Date(data.competenceMonth + '-01');
        const end = new Date(data.recurrenceEndMonth + '-01');
        monthsToCreate = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      } else {
        monthsToCreate = RECURRENCE_WINDOW - 1;
      }

      for (let i = 1; i <= monthsToCreate; i++) {
        const nextMonth = addMonthsToMonthKey(data.competenceMonth!, i);
        const nextVencimento = data.vencimento ? addMonthsToDateString(data.vencimento, i) : '';
        entries.push({
          ...baseEntry,
          status: 'previsto' as TransactionStatus,
          competenceMonth: nextMonth,
          vencimento: nextVencimento,
        });
      }
    }

    const promises = entries.map(entry => dbClient.addTransaction(entry));
    return Promise.all(promises);
  } catch (err) {
    console.error("[DB] Erro ao adicionar planejamento:", err);
    throw err;
  }
};

export const updateAccountPlanSeries = async (currentTx: Transaction, updatedFields: Partial<Transaction>, scope: RecurrenceScope, range?: { start: string, end: string }) => {
  const txs = await getEntries(currentTx.userId);
  const groupId = currentTx.recurrenceGroupId;
  
  if (!groupId || scope === 'current') {
    return dbClient.updateTransaction(currentTx.id!, { ...updatedFields, updatedAt: new Date().toISOString() });
  }

  let targetIds: string[] = [];
  const series = txs.filter(t => t.recurrenceGroupId === groupId);

  if (scope === 'forward') {
    targetIds = series.filter(t => t.competenceMonth >= currentTx.competenceMonth).map(t => t.id!);
  } else if (scope === 'backward') {
    targetIds = series.filter(t => t.competenceMonth <= currentTx.competenceMonth).map(t => t.id!);
  } else if (scope === 'all') {
    targetIds = series.map(t => t.id!);
  } else if (scope === 'range' && range) {
    targetIds = series.filter(t => t.competenceMonth >= range.start && t.competenceMonth <= range.end).map(t => t.id!);
  }

  const payload = { ...updatedFields, updatedAt: new Date().toISOString() };

  if ('bulkUpdateTransactions' in dbClient) {
    return (dbClient as any).bulkUpdateTransactions(targetIds, payload);
  } else {
    const promises = targetIds.map(id => dbClient.updateTransaction(id, payload));
    return Promise.all(promises);
  }
};

export const deleteAccountPlanSeries = async (currentTx: Transaction, scope: RecurrenceScope, range?: { start: string, end: string }) => {
  const txs = await getEntries(currentTx.userId);
  const groupId = currentTx.recurrenceGroupId;
  
  if (!groupId || scope === 'current') {
    return dbClient.deleteTransaction(currentTx.id!);
  }

  let targetIds: string[] = [];
  const series = txs.filter(t => t.recurrenceGroupId === groupId);

  if (scope === 'forward') {
    targetIds = series.filter(t => t.competenceMonth >= currentTx.competenceMonth).map(t => t.id!);
  } else if (scope === 'backward') {
    targetIds = series.filter(t => t.competenceMonth <= currentTx.competenceMonth).map(t => t.id!);
  } else if (scope === 'all') {
    targetIds = series.map(t => t.id!);
  } else if (scope === 'range' && range) {
    targetIds = series.filter(t => t.competenceMonth >= range.start && t.competenceMonth <= range.end).map(t => t.id!);
  }

  if ('bulkDeleteTransactions' in dbClient) {
    return (dbClient as any).bulkDeleteTransactions(targetIds);
  } else {
    const promises = targetIds.map(id => dbClient.deleteTransaction(id));
    return Promise.all(promises);
  }
};

function addMonthsToDateString(dateStr: string, months: number): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return dateStr;
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  } catch {
    return dateStr;
  }
}

export const getTransactions = getEntries;
export { 
  getAccounts, 
  addAccount, 
  updateAccount, 
  deleteAccount, 
  getCategories, 
  createCategory, 
  saveUserProfile, 
  wipeUserData 
} from './db_base_logic.ts';

export const getGoals = async (uid: string) => {
  try { return await dbClient.getGoals(uid); } catch { return []; }
};
export const getDebts = async (uid: string) => {
  try { return await dbClient.getDebts(uid); } catch { return []; }
};
export const getAdminUsersForExport = async () => [];

export const deleteEntry = dbClient.deleteTransaction;
export const updateAccountEntry = dbClient.updateTransaction;
