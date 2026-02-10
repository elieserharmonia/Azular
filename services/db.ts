
import { firebaseEnabled } from '../lib/firebase';
import { dbClient } from './dbClient';
import { Transaction, TransactionStatus } from '../types';
import { addMonthsToMonthKey } from '../utils/formatters';

const RECURRENCE_WINDOW = 12;

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

export const addAccountPlanEntry = async (data: Partial<Transaction>) => {
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
  createCategory, 
  saveUserProfile, 
  wipeUserData 
} from './db_base_logic';

export const getGoals = dbClient.getGoals;
export const getDebts = dbClient.getDebts;
export const getAdminUsersForExport = async () => [];

export const deleteEntry = dbClient.deleteTransaction;
export const updateAccountEntry = dbClient.updateTransaction;
