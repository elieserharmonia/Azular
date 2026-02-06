import { db } from '../lib/firebase';
import { Transaction, Account, Category, Goal, Debt } from '../types';

export const firestoreDbClient = {
  getAccounts: async (userId: string): Promise<Account[]> => {
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db!, 'accounts'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Account));
  },

  addAccount: async (data: any) => {
    const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    const docRef = await addDoc(collection(db!, 'accounts'), { 
      ...data, createdAt: serverTimestamp() 
    });
    return { id: docRef.id, ...data };
  },

  updateAccount: async (id: string, data: any) => {
    const { doc, updateDoc } = (await import('firebase/firestore')) as any;
    const ref = doc(db!, 'accounts', id);
    await updateDoc(ref, data);
  },

  deleteAccount: async (id: string) => {
    const { doc, deleteDoc } = (await import('firebase/firestore')) as any;
    await deleteDoc(doc(db!, 'accounts', id));
  },

  getCategories: async (userId: string): Promise<Category[]> => {
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db!, 'categories'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Category));
  },

  addCategory: async (userId: string, name: string, direction: any) => {
    const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    const docRef = await addDoc(collection(db!, 'categories'), { 
      userId, name, direction, createdAt: serverTimestamp() 
    });
    return docRef.id;
  },

  getTransactions: async (userId: string): Promise<Transaction[]> => {
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db!, 'transactions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Transaction));
  },

  addTransaction: async (data: any) => {
    const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    const docRef = await addDoc(collection(db!, 'transactions'), { 
      ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() 
    });
    return { id: docRef.id, ...data };
  },

  updateTransaction: async (id: string, data: any) => {
    const { doc, updateDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    const ref = doc(db!, 'transactions', id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },

  deleteTransaction: async (id: string) => {
    const { doc, deleteDoc } = (await import('firebase/firestore')) as any;
    await deleteDoc(doc(db!, 'transactions', id));
  },

  getDebts: async (userId: string): Promise<Debt[]> => {
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db!, 'debts'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Debt));
  },

  getGoals: async (userId: string): Promise<Goal[]> => {
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db!, 'goals'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Goal));
  }
};