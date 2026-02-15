// services/db.ts
import { dbClient } from './dbClient';
import { Transaction, TransactionStatus } from '../types';
import { addMonthsToMonthKey } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import {
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  getCategories,
  getSubcategories,
  createCategory,
  saveUserProfile,
  wipeUserData,
} from './db_base_logic';

export type RecurrenceScope = 'current' | 'forward' | 'all' | 'backward';

const RECURRENCE_WINDOW = 12;

function isPlainObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
}

/**
 * Remove undefined, troca NaN por null, normaliza strings vazias para null.
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

function safeNumber(v: any): number {
  const n = parseNumericValue(v);
  return Number.isFinite(n) ? n : 0;
}

function safeString(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

export const getEntries = async (userId: string): Promise<Transaction[]> => {
  const data = await dbClient.getTransactions(userId);

  return (data as any[]).map((t) => {
    // fontes possíveis
    const rawDescription = t.descricao ?? t.description ?? t.descr ?? t.desc;
    const rawValue = t.valor ?? t.plannedAmount ?? t.amount;

    const tipo = t.tipo || (t.type === 'credit' ? 'receber' : 'pagar');
    const vencimento =
      t.vencimento ||
      t.dueDate ||
      t.receiveDate ||
      t.date ||
      t.competenceMonth?.substring(0, 7) ? `${t.competenceMonth}-01` : '';

    const competenceMonth =
      t.competenceMonth ||
      (t.vencimento ? String(t.vencimento).substring(0, 7) : '') ||
      (t.dueDate ? String(t.dueDate).substring(0, 7) : '') ||
      (t.receiveDate ? String(t.receiveDate).substring(0, 7) : '');

    const plannedAmount = safeNumber(t.plannedAmount ?? t.amount ?? t.valor);
    const amount = safeNumber(t.amount ?? t.plannedAmount ?? t.valor);

    return ({
      ...t,

      // ✅ padroniza o app (as páginas novas usam isso)
      description: safeString(rawDescription),
      plannedAmount,
      amount,

      // ✅ compatibilidade com as páginas antigas (AccountsPay/Receive usam isso)
      descricao: safeString(rawDescription),
      valor: plannedAmount,

      tipo,
      vencimento: safeString(vencimento),
      competenceMonth: safeString(competenceMonth),
      status: t.status || 'previsto',
      categoryGroup: t.categoryGroup || 'Outros',
    } as any);
  });
};

export const addAccountPlanEntry = async (data: Partial<Transaction>) => {
  const entries: Partial<Transaction>[] = [];
  const isRec = Boolean((data as any).recorrente ?? (data as any).isRecurring);
  const recurrenceGroupId = isRec ? `rg-${Math.random().toString(36).substr(2, 9)}` : null;

  const baseEntry: Partial<Transaction> = {
    ...data,
    plannedAmount: safeNumber((data as any).plannedAmount ?? (data as any).amount ?? (data as any).valor),
    recurrenceGroupId,
    isRecurring: isRec,
    recorrente: isRec,
    status: 'previsto' as TransactionStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!isRec) {
    (baseEntry as any).recurrenceMode = null;
    (baseEntry as any).recurrenceEndMonth = null;
    (baseEntry as any).recurrenceCount = null;
  }

  const safeBase = sanitizeForFirestore(baseEntry);

  if (!isRec) {
    return dbClient.addTransaction(safeBase);
  }

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

  entries.push(safeBase);

  for (let i = 1; i <= monthsToCreate; i++) {
    const nextMonth = addMonthsToMonthKey((data as any).competenceMonth!, i);
    const nextVencimento = (data as any).vencimento ? addMonthsToDateString((data as any).vencimento, i) : null;
    entries.push(
      sanitizeForFirestore({
        ...baseEntry,
        competenceMonth: nextMonth,
        vencimento: nextVencimento,
      } as any)
    );
  }

  return Promise.all(entries.map((entry) => dbClient.addTransaction(entry)));
};

export const updateAccountPlanSeries = async (
  currentTx: Transaction,
  updatedFields: Partial<Transaction>,
  scope: RecurrenceScope
) => {
  const txs = await getEntries((currentTx as any).userId);
  const groupId = (currentTx as any).recurrenceGroupId;

  if (!groupId) {
    return dbClient.updateTransaction((currentTx as any).id!, sanitizeForFirestore(updatedFields as any));
  }

  const series = txs.filter((t: any) => t.recurrenceGroupId === groupId);

  let targetIds: string[] = [];
  if (scope === 'current') targetIds = [(currentTx as any).id!];
  else if (scope === 'forward')
    targetIds = series
      .filter((t: any) => t.competenceMonth >= (currentTx as any).competenceMonth)
      .map((t: any) => t.id!);
  else if (scope === 'backward')
    targetIds = series
      .filter((t: any) => t.competenceMonth <= (currentTx as any).competenceMonth)
      .map((t: any) => t.id!);
  else targetIds = series.map((t: any) => t.id!);

  const safe = sanitizeForFirestore({
    ...updatedFields,
    plannedAmount: safeNumber((updatedFields as any).plannedAmount ?? (updatedFields as any).amount ?? (updatedFields as any).valor),
    updatedAt: new Date().toISOString(),
  } as any);

  if ('bulkUpdateTransactions' in dbClient) {
    return (dbClient as any).bulkUpdateTransactions(targetIds, safe);
  }
  return Promise.all(targetIds.map((id) => dbClient.updateTransaction(id, safe)));
};

export const deleteAccountPlanSeries = async (currentTx: Transaction, scope: RecurrenceScope) => {
  const txs = await getEntries((currentTx as any).userId);
  const groupId = (currentTx as any).recurrenceGroupId;

  if (!groupId) return dbClient.deleteTransaction((currentTx as any).id!);

  const series = txs.filter((t: any) => t.recurrenceGroupId === groupId);

  let targetIds: string[] = [];
  if (scope === 'current') targetIds = [(currentTx as any).id!];
  else if (scope === 'forward')
    targetIds = series
      .filter((t: any) => t.competenceMonth >= (currentTx as any).competenceMonth)
      .map((t: any) => t.id!);
  else if (scope === 'backward')
    targetIds = series
      .filter((t: any) => t.competenceMonth <= (currentTx as any).competenceMonth)
      .map((t: any) => t.id!);
  else targetIds = series.map((t: any) => t.id!);

  if ('bulkDeleteTransactions' in dbClient) {
    return (dbClient as any).bulkDeleteTransactions(targetIds);
  }
  return Promise.all(targetIds.map((id) => dbClient.deleteTransaction(id)));
};

function addMonthsToDateString(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

export const getTransactions = getEntries;
export {
  getAccounts,
  addAccount,
  updateAccount,
  deleteAccount,
  getCategories,
  getSubcategories,
  createCategory,
  saveUserProfile,
  wipeUserData
} from './db_base_logic';

export const getGoals = dbClient.getGoals;
export const getDebts = dbClient.getDebts;
export const getAdminUsersForExport = async () => [];
export const deleteEntry = dbClient.deleteTransaction;
export const updateAccountEntry = dbClient.updateTransaction;
