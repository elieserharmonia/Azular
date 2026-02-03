
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, Account, Category, Goal, Debt } from '../types';

export const getTransactions = async (userId: string, competenceMonth?: string) => {
  if (!userId) return [];
  const coll = collection(db, 'transactions');
  const q = query(coll, where('userId', '==', userId));
  
  try {
    const snap = await getDocs(q);
    let docs = snap.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(0) 
      } as Transaction;
    });

    if (competenceMonth) {
      docs = docs.filter(t => t.competenceMonth === competenceMonth);
    }

    return docs.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return dateB - dateA;
    });
  } catch (error: any) {
    console.error("getTransactions error:", error);
    throw error;
  }
};

export const getDebts = async (userId: string) => {
  if (!userId) return [];
  try {
    const q = query(collection(db, 'debts'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => {
      const data = d.data();
      return { 
        id: d.id, 
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(0)
      } as Debt;
    });

    return docs.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return dateB - dateA;
    });
  } catch (error: any) {
    console.error("getDebts error:", error);
    throw error;
  }
};

export const getAccounts = async (userId: string) => {
  if (!userId) return [];
  const coll = collection(db, 'accounts');
  const q = query(coll, where('userId', '==', userId));
  
  try {
    const snap = await getDocs(q);
    const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
    return docs.filter(acc => acc.active !== false);
  } catch (error: any) {
    console.error("getAccounts error:", error);
    throw error;
  }
};

export const getCategories = async (userId: string) => {
  if (!userId) return [];
  const coll = collection(db, 'categories');
  const q = query(coll, where('userId', '==', userId));
  try {
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  } catch (error) {
    console.error("getCategories error:", error);
    return [];
  }
};

export const getGoals = async (userId: string) => {
  if (!userId) return [];
  const coll = collection(db, 'goals');
  const q = query(coll, where('userId', '==', userId));
  try {
    const snap = await getDocs(q);
    const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
    return docs.sort((a, b) => (a.priority || 0) - (b.priority || 0));
  } catch (error) {
    console.error("getGoals error:", error);
    return [];
  }
};

export const addTransaction = async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!data.userId) throw new Error("userId é obrigatório.");
  return addDoc(collection(db, 'transactions'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const updateTransaction = async (id: string, data: Partial<Transaction>) => {
  const ref = doc(db, 'transactions', id);
  const { id: _, ...cleanData } = data as any;
  return updateDoc(ref, {
    ...cleanData,
    updatedAt: serverTimestamp()
  });
};

export const deleteTransaction = async (id: string) => {
  return deleteDoc(doc(db, 'transactions', id));
};
