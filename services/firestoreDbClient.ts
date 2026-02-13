
import { getFirebaseApp, firebaseEnabled } from "../lib/firebase";
import { Account, Category, Transaction, Debt, Goal } from '../types';
import { getDb } from './firestoreClient';
import { getFirestoreModule } from '../lib/firebaseModules';

export const firestoreDbClient = {
  getAccounts: async (userId: string): Promise<Account[]> => {
    const db = await getDb();
    const { collection, query, where, getDocs } = await getFirestoreModule();
    const q = query(collection(db, 'accounts'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Account));
  },

  addAccount: async (data: any) => {
    const db = await getDb();
    const { collection, addDoc, serverTimestamp } = await getFirestoreModule();
    const docRef = await addDoc(collection(db, 'accounts'), { 
      ...data, createdAt: serverTimestamp() 
    });
    return { id: docRef.id, ...data };
  },

  updateAccount: async (id: string, data: any) => {
    const db = await getDb();
    const { doc, updateDoc } = await getFirestoreModule();
    const ref = doc(db, 'accounts', id);
    await updateDoc(ref, data);
  },

  deleteAccount: async (id: string) => {
    const db = await getDb();
    const { doc, deleteDoc } = await getFirestoreModule();
    await deleteDoc(doc(db, 'accounts', id));
  },

  getCategories: async (userId: string): Promise<Category[]> => {
    const db = await getDb();
    const { collection, query, where, getDocs } = await getFirestoreModule();
    const q = query(collection(db, 'categories'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Category));
  },

  createCategory: async (userId: string, name: string, direction: any) => {
    const db = await getDb();
    const { collection, addDoc, serverTimestamp } = await getFirestoreModule();
    const docRef = await addDoc(collection(db, 'categories'), { 
      userId, name, direction, createdAt: serverTimestamp() 
    });
    return docRef.id;
  },

  getTransactions: async (userId: string): Promise<Transaction[]> => {
    const db = await getDb();
    const { collection, query, where, getDocs } = await getFirestoreModule();
    const q = query(collection(db, 'transactions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Transaction));
  },

  addTransaction: async (data: any) => {
    const db = await getDb();
    const { collection, addDoc, serverTimestamp } = await getFirestoreModule();
    const docRef = await addDoc(collection(db, 'transactions'), { 
      ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() 
    });
    return { id: docRef.id, ...data };
  },

  updateTransaction: async (id: string, data: any) => {
    const db = await getDb();
    const { doc, updateDoc, serverTimestamp } = await getFirestoreModule();
    const ref = doc(db, 'transactions', id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },

  deleteTransaction: async (id: string) => {
    const db = await getDb();
    const { doc, deleteDoc } = await getFirestoreModule();
    await deleteDoc(doc(db, 'transactions', id));
  },

  getDebts: async (userId: string): Promise<Debt[]> => {
    const db = await getDb();
    const { collection, query, where, getDocs } = await getFirestoreModule();
    const q = query(collection(db, 'debts'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Debt));
  },

  getGoals: async (userId: string): Promise<Goal[]> => {
    const db = await getDb();
    const { collection, query, where, getDocs } = await getFirestoreModule();
    const q = query(collection(db, 'goals'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Goal));
  }
};
