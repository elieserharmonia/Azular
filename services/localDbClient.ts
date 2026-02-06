
import { Transaction, Account, Category, Goal, Debt } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';
import { safeStorage } from '../utils/storage';

const LS_KEY = (name: string) => `azular_preview_${name}`;

const getLS = <T>(key: string, def: T): T => {
  const data = safeStorage.get(LS_KEY(key));
  try {
    return data ? JSON.parse(data) : def;
  } catch {
    return def;
  }
};

const setLS = (key: string, data: any) => {
  safeStorage.set(LS_KEY(key), JSON.stringify(data));
};

export const localDbClient = {
  getAccounts: async (userId: string): Promise<Account[]> => {
    const accs = getLS<Account[]>('accounts', []);
    if (accs.length === 0) {
      const initial: Account[] = [
        { id: 'acc-demo-1', name: 'Conta Corrente (Demo)', kind: 'checking', initialBalance: 1500, active: true, userId, hasCreditCard: false, isInvestment: false, createdAt: new Date().toISOString() }
      ];
      setLS('accounts', initial);
      return initial;
    }
    return accs;
  },

  addAccount: async (data: any) => {
    const items = getLS<any[]>('accounts', []);
    const newItem = { ...data, id: `acc-${Date.now()}`, createdAt: new Date().toISOString() };
    setLS('accounts', [...items, newItem]);
    return newItem;
  },

  updateAccount: async (id: string, data: any) => {
    const items = getLS<Account[]>('accounts', []);
    const idx = items.findIndex(t => t.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...data };
      setLS('accounts', items);
    }
  },

  deleteAccount: async (id: string) => {
    const items = getLS<Account[]>('accounts', []);
    setLS('accounts', items.filter(t => t.id !== id));
  },

  getCategories: async (userId: string): Promise<Category[]> => {
    const cats = getLS<Category[]>('categories', []);
    if (cats.length === 0) {
      const initial: Category[] = DEFAULT_CATEGORIES.map((c, i) => ({ 
        ...c, 
        direction: c.direction as 'credit' | 'debit' | 'both',
        id: `cat-demo-${i}`, 
        userId, 
        createdAt: new Date().toISOString() 
      }));
      setLS('categories', initial);
      return initial;
    }
    return cats;
  },

  createCategory: async (userId: string, name: string, direction: any) => {
    const items = getLS<any[]>('categories', []);
    const newItem = { id: `cat-${Date.now()}`, userId, name, direction, createdAt: new Date().toISOString() };
    setLS('categories', [...items, newItem]);
    return newItem.id;
  },

  getTransactions: async (userId: string): Promise<Transaction[]> => {
    return getLS<Transaction[]>('transactions', []);
  },

  addTransaction: async (data: any) => {
    const items = getLS<any[]>('transactions', []);
    const newItem = { 
      ...data, 
      id: `tx-${Date.now()}`, 
      createdAt: { seconds: Date.now() / 1000 }, 
      updatedAt: { seconds: Date.now() / 1000 } 
    };
    setLS('transactions', [...items, newItem]);
    return newItem;
  },

  updateTransaction: async (id: string, data: any) => {
    const items = getLS<any[]>('transactions', []);
    const idx = items.findIndex(t => t.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...data, updatedAt: { seconds: Date.now() / 1000 } };
      setLS('transactions', items);
    }
  },

  bulkUpdateTransactions: async (ids: string[], data: any) => {
    const items = getLS<any[]>('transactions', []);
    const updated = items.map(t => ids.includes(t.id!) ? { ...t, ...data, updatedAt: { seconds: Date.now() / 1000 } } : t);
    setLS('transactions', updated);
  },

  deleteTransaction: async (id: string) => {
    const items = getLS<any[]>('transactions', []);
    setLS('transactions', items.filter(t => t.id !== id));
  },

  /**
   * EXCLUSÃO EM LOTE (PREVIEW/LOCAL)
   * Resolve o bug de apagar apenas o mês atual no modo demonstração.
   */
  bulkDeleteTransactions: async (ids: string[]) => {
    const items = getLS<any[]>('transactions', []);
    const remaining = items.filter(t => !ids.includes(t.id!));
    setLS('transactions', remaining);
    return true;
  },

  getProvisions: async (userId: string) => {
    const txs = getLS<Transaction[]>('transactions', []);
    return txs.filter(t => t.status === 'planned');
  },

  getDebts: async (userId: string): Promise<Debt[]> => getLS<Debt[]>('debts', []),
  addDebt: async (data: any) => {
    const items = getLS<any[]>('debts', []);
    const newItem = { ...data, id: `debt-${Date.now()}`, createdAt: new Date().toISOString() };
    setLS('debts', [...items, newItem]);
    return newItem;
  },

  getGoals: async (userId: string): Promise<Goal[]> => getLS<Goal[]>('goals', []),
  addGoal: async (data: any) => {
    const items = getLS<any[]>('goals', []);
    const newItem = { ...data, id: `goal-${Date.now()}`, createdAt: new Date().toISOString() };
    setLS('goals', [...items, newItem]);
    return newItem;
  }
};
