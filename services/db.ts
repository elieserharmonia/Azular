import { firebaseEnabled } from '../lib/firebase';
import { getDb } from './firestoreClient';
import { localDbClient } from './localDbClient';
import { Transaction, Account, Category, Goal, Debt, UserProfile } from '../types';

/**
 * Facade Global de Dados com Fallback Automático para Preview/Demo
 */

export const getTransactions = async (userId: string, competenceMonth?: string): Promise<Transaction[]> => {
  if (!firebaseEnabled) {
    let txs = await localDbClient.getTransactions(userId);
    if (competenceMonth) txs = txs.filter(t => t.competenceMonth === competenceMonth);
    return txs;
  }
  try {
    const db = await getDb();
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db, 'transactions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    let docs = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Transaction));
    if (competenceMonth) docs = docs.filter(t => t.competenceMonth === competenceMonth);
    return docs;
  } catch (err) {
    console.warn("getTransactions: Usando LocalDB devido a erro no Firebase", err);
    return localDbClient.getTransactions(userId);
  }
};

export const getAccounts = async (userId: string): Promise<Account[]> => {
  if (!firebaseEnabled) return localDbClient.getAccounts(userId);
  try {
    const db = await getDb();
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db, 'accounts'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Account));
  } catch (err) {
    return localDbClient.getAccounts(userId);
  }
};

export const addAccount = async (data: Partial<Account>) => {
  if (!firebaseEnabled) return localDbClient.addAccount(data);
  try {
    const db = await getDb();
    const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    return addDoc(collection(db, 'accounts'), { ...data, createdAt: serverTimestamp() });
  } catch (err) {
    return localDbClient.addAccount(data);
  }
};

export const updateAccount = async (id: string, data: Partial<Account>) => {
  if (!firebaseEnabled) return localDbClient.updateAccount(id, data);
  try {
    const db = await getDb();
    const { doc, updateDoc } = (await import('firebase/firestore')) as any;
    return updateDoc(doc(db, 'accounts', id), data);
  } catch (err) {
    return localDbClient.updateAccount(id, data);
  }
};

export const deleteAccount = async (id: string) => {
  if (!firebaseEnabled) return localDbClient.deleteAccount(id);
  try {
    const db = await getDb();
    const { doc, deleteDoc } = (await import('firebase/firestore')) as any;
    return deleteDoc(doc(db, 'accounts', id));
  } catch (err) {
    return localDbClient.deleteAccount(id);
  }
};

export const getCategories = async (userId: string): Promise<Category[]> => {
  if (!firebaseEnabled) return localDbClient.getCategories(userId);
  try {
    const db = await getDb();
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db, 'categories'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Category));
  } catch (err) {
    return localDbClient.getCategories(userId);
  }
};

export const addTransaction = async (data: Partial<Transaction>) => {
  if (!firebaseEnabled) return localDbClient.addTransaction(data);
  try {
    const db = await getDb();
    const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    return addDoc(collection(db, 'transactions'), { 
      ...data, 
      createdAt: serverTimestamp(), 
      updatedAt: serverTimestamp() 
    });
  } catch (err) {
    return localDbClient.addTransaction(data);
  }
};

export const updateTransaction = async (id: string, data: Partial<Transaction>) => {
  if (!firebaseEnabled) return localDbClient.updateTransaction(id, data);
  try {
    const db = await getDb();
    const { doc, getDoc, updateDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    const ref = doc(db, 'transactions', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("NOT_FOUND");
    return updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  } catch (err) {
    return localDbClient.updateTransaction(id, data);
  }
};

export const deleteTransaction = async (id: string) => {
  if (!firebaseEnabled) return localDbClient.deleteTransaction(id);
  try {
    const db = await getDb();
    const { doc, deleteDoc } = (await import('firebase/firestore')) as any;
    return deleteDoc(doc(db, 'transactions', id));
  } catch (err) {
    return localDbClient.deleteTransaction(id);
  }
};

export const createCategory = async (userId: string, name: string, direction: any) => {
  if (!firebaseEnabled) return localDbClient.createCategory(userId, name, direction);
  try {
    const db = await getDb();
    const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    const docRef = await addDoc(collection(db, 'categories'), { userId, name, direction, createdAt: serverTimestamp() });
    return docRef.id;
  } catch (err) {
    return localDbClient.createCategory(userId, name, direction);
  }
};

export const getDebts = async (userId: string): Promise<Debt[]> => {
  if (!firebaseEnabled) return localDbClient.getDebts(userId);
  try {
    const db = await getDb();
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db, 'debts'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Debt));
  } catch (err) {
    return localDbClient.getDebts(userId);
  }
};

export const getGoals = async (userId: string): Promise<Goal[]> => {
  if (!firebaseEnabled) return localDbClient.getGoals(userId);
  try {
    const db = await getDb();
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db, 'goals'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Goal));
  } catch (err) {
    return localDbClient.getGoals(userId);
  }
};

export const saveUserProfile = async (uid: string, data: any) => {
  if (!firebaseEnabled) {
    localStorage.setItem('azular_preview_profile', JSON.stringify({ ...data, uid }));
    return;
  }
  try {
    const db = await getDb();
    const { doc, setDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    return setDoc(doc(db, 'users', uid), { ...data, uid, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    localStorage.setItem('azular_preview_profile', JSON.stringify({ ...data, uid }));
  }
};

export const getAdminUsersForExport = async (): Promise<UserProfile[]> => {
  if (!firebaseEnabled) return [];
  try {
    const db = await getDb();
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db, 'users'), where('marketingOptIn', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => doc.data() as UserProfile);
  } catch (err) {
    return [];
  }
};