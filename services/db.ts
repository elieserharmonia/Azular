import { firebaseEnabled } from '../lib/firebase';
import { getDb } from './firestoreClient';
import { localDbClient } from './localDbClient';
import { Transaction, Account, Category, Goal, Debt, UserProfile } from '../types';

/**
 * Facade Global de Dados
 */

export const getTransactions = async (userId: string, competenceMonth?: string): Promise<Transaction[]> => {
  if (!firebaseEnabled) {
    let txs = await localDbClient.getTransactions(userId);
    if (competenceMonth) txs = txs.filter(t => t.competenceMonth === competenceMonth);
    return txs;
  }
  const db = await getDb();
  // Fix: cast dynamic firestore import to any
  const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
  const q = query(collection(db, 'transactions'), where('userId', '==', userId));
  const snap = await getDocs(q);
  let docs = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Transaction));
  if (competenceMonth) docs = docs.filter(t => t.competenceMonth === competenceMonth);
  return docs;
};

export const getAccounts = async (userId: string): Promise<Account[]> => {
  if (!firebaseEnabled) return localDbClient.getAccounts(userId);
  const db = await getDb();
  // Fix: cast dynamic firestore import to any
  const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
  const q = query(collection(db, 'accounts'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Account));
};

export const getCategories = async (userId: string): Promise<Category[]> => {
  if (!firebaseEnabled) return localDbClient.getCategories(userId);
  const db = await getDb();
  // Fix: cast dynamic firestore import to any
  const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
  const q = query(collection(db, 'categories'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Category));
};

export const addTransaction = async (data: Partial<Transaction>) => {
  if (!firebaseEnabled) return localDbClient.addTransaction(data);
  
  if (!data.userId) {
    throw new Error("MISSING_USERID");
  }

  const db = await getDb();
  // Fix: cast dynamic firestore import to any
  const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
  
  return addDoc(collection(db, 'transactions'), { 
    ...data, 
    createdAt: serverTimestamp(), 
    updatedAt: serverTimestamp() 
  });
};

export const updateTransaction = async (id: string, data: Partial<Transaction>) => {
  if (!firebaseEnabled) return localDbClient.updateTransaction(id, data);
  
  const db = await getDb();
  // Fix: cast dynamic firestore import to any
  const { doc, getDoc, updateDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
  const ref = doc(db, 'transactions', id);

  // Pre-flight check to handle Firestore Rules "Insufficient Permissions" gracefully
  // and identify orphan documents without userId
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("NOT_FOUND");
  }

  const currentData = snap.data();
  if (!currentData.userId) {
    throw new Error("ORPHAN_DOC");
  }

  // Se o usuário logado for diferente do dono do documento
  if (data.userId && currentData.userId !== data.userId) {
    throw new Error("FORBIDDEN");
  }

  return updateDoc(ref, { 
    ...data, 
    updatedAt: serverTimestamp() 
  });
};

export const deleteTransaction = async (id: string) => {
  if (!firebaseEnabled) return localDbClient.deleteTransaction(id);
  const db = await getDb();
  // Fix: cast dynamic firestore import to any
  const { doc, deleteDoc } = (await import('firebase/firestore')) as any;
  return deleteDoc(doc(db, 'transactions', id));
};

export const createCategory = async (userId: string, name: string, direction: any) => {
  if (!firebaseEnabled) return localDbClient.createCategory(userId, name, direction);
  const db = await getDb();
  // Fix: cast dynamic firestore import to any
  const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
  const docRef = await addDoc(collection(db, 'categories'), { userId, name, direction, createdAt: serverTimestamp() });
  return docRef.id;
};

export const getDebts = async (userId: string): Promise<Debt[]> => {
  if (!firebaseEnabled) return localDbClient.getDebts(userId);
  const db = await getDb();
  // Fix: cast dynamic firestore import to any
  const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
  const q = query(collection(db, 'debts'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Debt));
};

export const getGoals = async (userId: string): Promise<Goal[]> => {
  if (!firebaseEnabled) return localDbClient.getGoals(userId);
  const db = await getDb();
  // Fix: cast dynamic firestore import to any
  const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
  const q = query(collection(db, 'goals'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Goal));
};

export const saveUserProfile = async (uid: string, data: any) => {
  if (!firebaseEnabled) {
    localStorage.setItem('azular_preview_profile', JSON.stringify({ ...data, uid }));
    return;
  }
  const db = await getDb();
  // Fix: cast dynamic firestore import to any
  const { doc, setDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
  return setDoc(doc(db, 'users', uid), { ...data, uid, updatedAt: serverTimestamp() }, { merge: true });
};

export const getAdminUsersForExport = async (): Promise<UserProfile[]> => {
  if (!firebaseEnabled) return [];
  const db = await getDb();
  // Fix: cast dynamic firestore import to any
  const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
  const q = query(collection(db, 'users'), where('marketingOptIn', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((doc: any) => doc.data() as UserProfile);
};