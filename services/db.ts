// services/db.ts
import { dbClient } from './dbClient';
import { Transaction, TransactionStatus } from '../types';
import { addMonthsToMonthKey } from '../utils/formatters';
import {
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  getCategories,
  createCategory,
  saveUserProfile,
  wipeUserData,
} from './db_base_logic';

const RECURRENCE_WINDOW = 12;

function isPlainObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
}

/**
 * Remove undefined, troca NaN por null, normaliza strings vazias para null.
 * Firestore NÃO aceita undefined / NaN.
 */
export function sanitizeForFirestore<T extends Record<string, any>>(input: T): T {
  const out: any = Array.isArray(input) ? [] : {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;

    if (typeof v === "number" && Number.isNaN(v)) {
      out[k] = null;
      continue;
    }

    if (typeof v === "string" && v.trim() === "") {
      out[k] = null;
      continue;
    }

    if (Array.isArray(v)) {
      out[k] = v.map((x) => (isPlainObject(x) ? sanitizeForFirestore(x) : x));
      continue;
    }

    if (isPlainObject(v)) {
      out[k] = sanitizeForFirestore(v);
      continue;
    }

    out[k] = v;
  }
  return out;
}

/**
 * Aqui você já estava usando getEntries como "getTransactions"
 */
export const getEntries = async (userId: string): Promise<Transaction[]> => {
  const data = await dbClient.getTransactions(userId);
  return (data as any[]).map(t => ({
    ...t,
    tipo: t.tipo || (t.type === 'credit' ? 'receber' : 'pagar'),
    vencimento: t.vencimento || t.dueDate || t.receiveDate || '',
    competenceMonth: t.competenceMonth || (t.vencimento ? t.vencimento.substring(0, 7) : ''),
    status: t.status || 'previsto',
    categoryGroup: t.categoryGroup || 'Outros'
  }));
};

/**
 * ✅ SALVAR "CONTA A PAGAR/RECEBER" (previsto)
 * Corrige o bug: se NÃO marcar recorrente, ainda salva sem erro.
 */
export const addAccountPlanEntry = async (data: Partial<Transaction>) => {
  const entries: Partial<Transaction>[] = [];

  // compatibilidade: algumas telas usam "recorrente", outras "isRecurring"
  const isRec = Boolean((data as any).recorrente ?? (data as any).isRecurring);

  const recurrenceGroupId = isRec
    ? `rg-${Math.random().toString(36).substr(2, 9)}`
    : null;

  const baseEntry: Partial<Transaction> = {
    ...data,
    recurrenceGroupId,
    isRecurring: isRec,
    recorrente: isRec, // mantém compatibilidade com sua tela
    status: 'previsto' as TransactionStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // ✅ Se NÃO é recorrente, limpa todos os campos de recorrência
  if (!isRec) {
    (baseEntry as any).recurrenceMode = null;
    (baseEntry as any).recurrenceEndMonth = null;
    (baseEntry as any).recurrenceCount = null;
  }

  // ✅ Sempre sanitiza
  const safeBase = sanitizeForFirestore(baseEntry);
  entries.push(safeBase);

  // ✅ Se não recorrente: salva só 1 item e sai
  if (!isRec) {
    return dbClient.addTransaction(safeBase);
  }

  // --- Daqui pra baixo: sua lógica de série (igual a sua, só com sanitize) ---
  let monthsToCreate = 0;

  if ((data as any).recurrenceMode === 'count') {
    monthsToCreate = ((data as any).recurrenceCount || 1) - 1;
  } else if ((data as any).recurrenceMode === 'until' && (data as any).recurrenceEndMonth) {
    const start = new Date((data as any).competenceMonth + '-01');
    const end = new Date((data as any).recurrenceEndMonth + '-01');
    monthsToCreate =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
  } else {
    monthsToCreate = RECURRENCE_WINDOW - 1;
  }

  for (let i = 1; i <= monthsToCreate; i++) {
    const nextMonth = addMonthsToMonthKey((data as any).competenceMonth!, i);
    const nextVencimento = (data as any).vencimento ? addMonthsToDateString((data as any).vencimento, i) : null;

    entries.push(sanitizeForFirestore({
      ...baseEntry,
      competenceMonth: nextMonth,
      vencimento: nextVencimento,
      status: 'previsto' as TransactionStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any));
  }

  const promises = entries.map(entry => dbClient.addTransaction(sanitizeForFirestore(entry as any)));
  return Promise.all(promises);
};

export const updateAccountPlanSeries = async (
  currentTx: Transaction,
  updatedFields: Partial<Transaction>,
  scope: 'current' | 'forward' | 'all'
) => {
  const txs = await getEntries(currentTx.userId);
  const groupId = currentTx.recurrenceGroupId;
  if (!groupId) return dbClient.updateTransaction(currentTx.id!, sanitizeForFirestore(updatedFields as any));

  const series = txs.filter(t => t.recurrenceGroupId === groupId);

  let targetIds: string[] = [];
  if (scope === 'current') targetIds = [currentTx.id!];
  else if (scope === 'forward') targetIds = series.filter(t => t.competenceMonth >= currentTx.competenceMonth).map(t => t.id!);
  else targetIds = series.map(t => t.id!);

  const safe = sanitizeForFirestore({ ...updatedFields, updatedAt: new Date().toISOString() } as any);

  if ('bulkUpdateTransactions' in dbClient) {
    return (dbClient as any).bulkUpdateTransactions(targetIds, safe);
  }
  return Promise.all(targetIds.map(id => dbClient.updateTransaction(id, safe)));
};

export const deleteAccountPlanSeries = async (
  currentTx: Transaction,
  scope: 'current' | 'forward' | 'all'
) => {
  const txs = await getEntries(currentTx.userId);
  const groupId = currentTx.recurrenceGroupId;
  if (!groupId) return dbClient.deleteTransaction(currentTx.id!);

  const series = txs.filter(t => t.recurrenceGroupId === groupId);

  let targetIds: string[] = [];
  if (scope === 'current') targetIds = [currentTx.id!];
  else if (scope === 'forward') targetIds = series.filter(t => t.competenceMonth >= currentTx.competenceMonth).map(t => t.id!);
  else targetIds = series.map(t => t.id!);

  if ('bulkDeleteTransactions' in dbClient) {
    return (dbClient as any).bulkDeleteTransactions(targetIds);
  }
  return Promise.all(targetIds.map(id => dbClient.deleteTransaction(id)));
};

function addMonthsToDateString(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

// ✅ Exports padrão do seu app
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
} from './db_base_logic';

export const getGoals = dbClient.getGoals;
export const getDebts = dbClient.getDebts;
export const getAdminUsersForExport = async () => [];

export const deleteEntry = dbClient.deleteTransaction;
export const updateAccountEntry = dbClient.updateTransaction;
