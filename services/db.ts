
import { firebaseEnabled } from '../lib/firebase';
import { dbClient } from './dbClient';
import { Transaction, TransactionStatus, TransactionType } from '../types';
import { addMonthsToMonthKey, getCurrentMonth } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';

const RECURRENCE_WINDOW = 12;

/**
 * SANITIZER: Normaliza uma transação garantindo integridade dos dados.
 * Aplica as regras de negócio para fallback de valores nulos ou inválidos.
 */
export const normalizeTransaction = (t: any): Transaction => {
  // 1. Tratamento de Valores Numéricos (plannedAmount null -> 0)
  const amount = parseNumericValue(t.amount || t.valor || 0);
  const plannedAmount = parseNumericValue(t.plannedAmount ?? t.amount ?? t.valor ?? 0);
  
  // 2. Tratamento de Datas e Competência
  // Se não houver data nenhuma, lançamos erro para o getEntries ignorar o registro
  const rawDate = t.vencimento || t.dueDate || t.receiveDate;
  if (!rawDate && !t.competenceMonth) {
    throw new Error("Registro sem data válida para competência.");
  }

  const vencimento = rawDate || new Date().toISOString().split('T')[0];
  const competence = t.competenceMonth || (vencimento ? vencimento.substring(0, 7) : getCurrentMonth());

  // 3. Tipagem e Status
  const validTypes: TransactionType[] = ['pagar', 'receber', 'credit', 'debit'];
  const tipo = validTypes.includes(t.tipo) ? t.tipo : (t.type || 'pagar');
  
  const validStatus: TransactionStatus[] = ['previsto', 'pago', 'recebido', 'atrasado', 'cancelado'];
  const status = validStatus.includes(t.status) ? t.status : 'previsto';

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
    status: status as TransactionStatus,
    // Categoria inexistente -> mover para Outros
    categoryGroup: t.categoryGroup || 'Outros',
    accountId: t.accountId || '',
    // RecurrenceGroupId inválido/nulo -> tratar como não recorrente
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
        // Logamos o erro mas continuamos o processamento (ignora o registro ruim)
        console.warn("[DB Sanitizer] Ignorando registro corrompido:", t?.id, err);
        return null;
      }
    }).filter((t): t is Transaction => t !== null);
  } catch (err) {
    console.error("[DB] Falha crítica no carregamento de transações:", err);
    return []; // Retorna vazio para não travar o boot
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

export const updateAccountPlanSeries = async (currentTx: Transaction, updatedFields: Partial<Transaction>, scope: 'current' | 'forward' | 'all') => {
  const txs = await getEntries(currentTx.userId);
  const groupId = currentTx.recurrenceGroupId;
  if (!groupId) return dbClient.updateTransaction(currentTx.id!, updatedFields);

  let targetIds: string[] = [];
  const series = txs.filter(t => t.recurrenceGroupId === groupId);

  if (scope === 'current') targetIds = [currentTx.id!];
  else if (scope === 'forward') targetIds = series.filter(t => t.competenceMonth >= currentTx.competenceMonth).map(t => t.id!);
  else if (scope === 'all') targetIds = series.map(t => t.id!);

  if ('bulkUpdateTransactions' in dbClient) {
    return (dbClient as any).bulkUpdateTransactions(targetIds, { ...updatedFields, updatedAt: new Date().toISOString() });
  } else {
    const promises = targetIds.map(id => dbClient.updateTransaction(id, updatedFields));
    return Promise.all(promises);
  }
};

export const deleteAccountPlanSeries = async (currentTx: Transaction, scope: 'current' | 'forward' | 'all') => {
  const txs = await getEntries(currentTx.userId);
  const groupId = currentTx.recurrenceGroupId;
  if (!groupId) return dbClient.deleteTransaction(currentTx.id!);

  let targetIds: string[] = [];
  const series = txs.filter(t => t.recurrenceGroupId === groupId);

  if (scope === 'current') targetIds = [currentTx.id!];
  else if (scope === 'forward') targetIds = series.filter(t => t.competenceMonth >= currentTx.competenceMonth).map(t => t.id!);
  else if (scope === 'all') targetIds = series.map(t => t.id!);

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
