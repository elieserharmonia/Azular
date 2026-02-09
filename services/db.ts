
import { firebaseEnabled } from '../lib/firebase';
import { localDbClient } from './localDbClient';
import { Transaction } from '../types';

// Janela de geração de recorrência (em meses)
const RECURRENCE_WINDOW = 12;

/**
 * Calcula a próxima data baseado na frequência
 */
const getNextDate = (dateStr: string, freq: string, interval: number): string => {
  const d = new Date(dateStr + 'T12:00:00');
  if (freq === 'mensal') d.setMonth(d.getMonth() + interval);
  else if (freq === 'semanal') d.setDate(d.getDate() + (7 * interval));
  else if (freq === 'quinzenal') d.setDate(d.getDate() + (15 * interval));
  else if (freq === 'anual') d.setFullYear(d.getFullYear() + interval);
  
  return d.toISOString().split('T')[0];
};

/**
 * ADICIONAR CONTA (Com suporte a recorrência)
 */
export const addAccountEntry = async (data: Partial<Transaction>) => {
  const entries: Partial<Transaction>[] = [];
  const perfilId = data.recorrente ? `perfil_${Math.random().toString(36).substr(2, 9)}` : undefined;
  
  // Criar primeira ocorrência (ou única)
  const baseEntry = {
    ...data,
    perfilId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  entries.push(baseEntry);

  // Se for recorrente, gerar prole
  if (data.recorrente && data.recorrencia) {
    let currentDate = data.vencimento!;
    for (let i = 1; i < RECURRENCE_WINDOW; i++) {
      currentDate = getNextDate(currentDate, data.recorrencia.frequencia, data.recorrencia.intervalo);
      entries.push({
        ...baseEntry,
        vencimento: currentDate,
        status: 'previsto' // Futuros são sempre previstos
      });
    }
  }

  const promises = entries.map(entry => {
    return localDbClient.addTransaction(entry);
  });

  return Promise.all(promises);
};

/**
 * ATUALIZAR CONTA
 */
export const updateAccountEntry = async (id: string, data: Partial<Transaction>, mode: 'single' | 'future' = 'single') => {
  if (mode === 'single') {
    return localDbClient.updateTransaction(id, data);
  }

  // Se for 'future', precisamos buscar o perfilId e atualizar todos >= data atual
  const all = await getEntries(data.userId!);
  const current = all.find(t => t.id === id);
  if (!current?.perfilId) return localDbClient.updateTransaction(id, data);

  const targets = all.filter(t => t.perfilId === current.perfilId && t.vencimento >= current.vencimento);
  const promises = targets.map(t => localDbClient.updateTransaction(t.id!, data));
  return Promise.all(promises);
};

export const getEntries = async (userId: string): Promise<Transaction[]> => {
  const data = await localDbClient.getTransactions(userId);
  return (data as any[]).map(t => ({
    ...t,
    tipo: t.tipo || (t.type === 'credit' ? 'receber' : 'pagar'),
    vencimento: t.vencimento || t.dueDate || t.receiveDate,
    status: t.status === 'done' ? (t.tipo === 'receber' ? 'recebido' : 'pago') : (t.status || 'previsto')
  }));
};

export const deleteEntry = async (id: string, mode: 'single' | 'all' = 'single') => {
  if (mode === 'single') return localDbClient.deleteTransaction(id);
  
  const all = await getEntries("user-id-here"); // Simplificado
  const current = all.find(t => t.id === id);
  if (current?.perfilId) {
    const targets = all.filter(t => t.perfilId === current.perfilId).map(t => t.id!);
    return localDbClient.bulkDeleteTransactions(targets);
  }
  return localDbClient.deleteTransaction(id);
};

// Aliases for the app
export const getTransactions = getEntries;
export const addTransaction = localDbClient.addTransaction;
export const updateTransaction = localDbClient.updateTransaction;
export const addProvisionSeries = localDbClient.addTransaction; // Placeholder
export const updateProvisionSeries = localDbClient.updateTransaction; // Placeholder
export const deleteRecurringSeries = localDbClient.bulkDeleteTransactions; // Placeholder

// Goals and Debts
export const getGoals = localDbClient.getGoals;
export const getDebts = localDbClient.getDebts;
export const getAdminUsersForExport = async () => [];

// Re-exports das funções básicas de Categoria/Conta
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
