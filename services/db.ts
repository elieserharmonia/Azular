import { firebaseEnabled } from '../lib/firebase';
import { getDb } from './firestoreClient';
import { Transaction, Account, Category, Goal, Debt, UserProfile } from '../types';

const demoStore = {
  get: (key: string) => {
    try {
      const data = localStorage.getItem(`azular_demo_${key}`);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },
  set: (key: string, data: any[]) => {
    localStorage.setItem(`azular_demo_${key}`, JSON.stringify(data));
  },
  add: (key: string, item: any) => {
    const data = demoStore.get(key);
    const newItem = { 
      ...item, 
      id: Math.random().toString(36).substring(2, 11), 
      createdAt: new Date().toISOString() 
    };
    demoStore.set(key, [...data, newItem]);
    return newItem;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!firebaseEnabled) {
    const profiles = JSON.parse(localStorage.getItem('azular_demo_profiles') || '{}');
    return profiles[uid] || null;
  }
  const db = await getDb();
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() as UserProfile : null;
};

export const saveUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  if (!firebaseEnabled) {
    const profiles = JSON.parse(localStorage.getItem('azular_demo_profiles') || '{}');
    const updated = { ...(profiles[uid] || {}), ...data, uid, updatedAt: new Date().toISOString() };
    profiles[uid] = updated;
    localStorage.setItem('azular_demo_profiles', JSON.stringify(profiles));
    localStorage.setItem('azular_preview_profile', JSON.stringify(updated));
    return;
  }
  const db = await getDb();
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  return setDoc(doc(db, 'users', uid), { 
    ...data, 
    uid, 
    updatedAt: serverTimestamp() 
  }, { merge: true });
};

export const getTransactions = async (userId: string, competenceMonth?: string) => {
  if (!firebaseEnabled) {
    let docs = demoStore.get('transactions') as Transaction[];
    if (competenceMonth) docs = docs.filter(t => t.competenceMonth === competenceMonth);
    return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const db = await getDb();
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const q = query(collection(db, 'transactions'), where('userId', '==', userId));
  const snap = await getDocs(q);
  let docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
  if (competenceMonth) docs = docs.filter(t => t.competenceMonth === competenceMonth);
  return docs;
};

export const getAccounts = async (userId: string) => {
  if (!firebaseEnabled) {
    const accs = demoStore.get('accounts');
    return accs.length ? accs : [{ id: 'demo-acc', name: 'Conta Principal', initialBalance: 0, kind: 'checking', active: true }];
  }
  const db = await getDb();
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const q = query(collection(db, 'accounts'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
};

export const getCategories = async (userId: string) => {
  if (!firebaseEnabled) return demoStore.get('categories');
  const db = await getDb();
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const q = query(collection(db, 'categories'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
};

export const createCategory = async (userId: string, name: string, direction: 'credit' | 'debit' | 'both') => {
  if (!firebaseEnabled) {
    const newCat = demoStore.add('categories', { userId, name, direction });
    return newCat.id;
  }
  const db = await getDb();
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const docRef = await addDoc(collection(db, 'categories'), { userId, name, direction, createdAt: serverTimestamp() });
  return docRef.id;
};

export const addTransaction = async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!firebaseEnabled) return demoStore.add('transactions', data);
  const db = await getDb();
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  return addDoc(collection(db, 'transactions'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
};

export const updateTransaction = async (id: string, data: Partial<Transaction>) => {
  if (!firebaseEnabled) {
    const docs = demoStore.get('transactions');
    const idx = docs.findIndex((d: any) => d.id === id);
    if (idx !== -1) {
      docs[idx] = { ...docs[idx], ...data, updatedAt: new Date().toISOString() };
      demoStore.set('transactions', docs);
    }
    return;
  }
  const db = await getDb();
  const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
  const ref = doc(db, 'transactions', id);
  const { id: _, ...cleanData } = data as any;
  return updateDoc(ref, { ...cleanData, updatedAt: serverTimestamp() });
};

export const deleteTransaction = async (id: string) => {
  if (!firebaseEnabled) {
    const docs = demoStore.get('transactions');
    demoStore.set('transactions', docs.filter((d: any) => d.id !== id));
    return;
  }
  const db = await getDb();
  const { doc, deleteDoc } = await import('firebase/firestore');
  return deleteDoc(doc(db, 'transactions', id));
};

export const getDebts = async (userId: string) => !firebaseEnabled ? demoStore.get('debts') : [];
export const getGoals = async (userId: string) => !firebaseEnabled ? demoStore.get('goals') : [];

// Fix: Added getAdminUsersForExport to support fetching users who opted into marketing communications
export const getAdminUsersForExport = async (): Promise<UserProfile[]> => {
  if (!firebaseEnabled) {
    const profiles = JSON.parse(localStorage.getItem('azular_demo_profiles') || '{}');
    return Object.values(profiles).filter((u: any) => u.marketingOptIn) as UserProfile[];
  }
  const db = await getDb();
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const q = query(collection(db, 'users'), where('marketingOptIn', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as UserProfile);
};
