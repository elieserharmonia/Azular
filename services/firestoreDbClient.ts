import { db } from '../lib/firebase';
import { Transaction, Account, Category, Goal, Debt } from '../types';

export const firestoreDbClient = {
  getAccounts: async (userId: string): Promise<Account[]> => {
    // Fix: cast dynamic firestore import to any
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db!, 'accounts'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Account));
  },

  getCategories: async (userId: string): Promise<Category[]> => {
    // Fix: cast dynamic firestore import to any
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db!, 'categories'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Category));
  },

  addCategory: async (userId: string, name: string, direction: any) => {
    // Fix: cast dynamic firestore import to any
    const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    const docRef = await addDoc(collection(db!, 'categories'), { 
      userId, name, direction, createdAt: serverTimestamp() 
    });
    return docRef.id;
  },

  getTransactions: async (userId: string): Promise<Transaction[]> => {
    // Fix: cast dynamic firestore import to any
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db!, 'transactions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Transaction));
  },

  addTransaction: async (data: any) => {
    // Fix: cast dynamic firestore import to any
    const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    const docRef = await addDoc(collection(db!, 'transactions'), { 
      ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() 
    });
    return { id: docRef.id, ...data };
  },

  updateTransaction: async (id: string, data: any) => {
    // Fix: cast dynamic firestore import to any
    const { doc, updateDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    const ref = doc(db!, 'transactions', id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },

  deleteTransaction: async (id: string) => {
    // Fix: cast dynamic firestore import to any
    const { doc, deleteDoc } = (await import('firebase/firestore')) as any;
    await deleteDoc(doc(db!, 'transactions', id));
  },

  getDebts: async (userId: string): Promise<Debt[]> => {
    // Fix: cast dynamic firestore import to any
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db!, 'debts'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Debt));
  },

  getGoals: async (userId: string): Promise<Goal[]> => {
    // Fix: cast dynamic firestore import to any
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db!, 'goals'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Goal));
  }
};