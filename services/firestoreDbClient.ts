
// Fix: Use getFirebaseApp instead of non-existent app export
import { getFirebaseApp, firebaseEnabled } from "../lib/firebase";
// Fix: Added missing imports for the types used in this file
import { Account, Category, Transaction, Debt, Goal } from '../types';

let dbInstance: any = null;

/**
 * Retorna a instância do DB apenas se o Firebase estiver habilitado.
 * Implementa padrão Singleton para evitar erros de inicialização múltipla.
 */
export async function getDb() {
  // Fix: Obtain the app instance asynchronously to ensure it is initialized before use
  const app = await getFirebaseApp();
  
  if (!firebaseEnabled || !app) {
    throw new Error("FIRESTORE_DISABLED_IN_PREVIEW");
  }

  if (dbInstance) return dbInstance;

  try {
    const { 
      getFirestore, 
      initializeFirestore, 
      persistentLocalCache, 
      persistentMultipleTabManager 
    } = (await import("firebase/firestore")) as any;
    
    try {
      // Tenta inicializar com cache persistente (ideal para PWA)
      dbInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch (e: any) {
      // Se já houver uma instância (mesmo que com outras opções), recupera a existente
      if (e.code === 'failed-precondition' || e.message?.includes('already been called')) {
        dbInstance = getFirestore(app);
      } else {
        throw e;
      }
    }

    return dbInstance;
  } catch (e) {
    console.warn("Falha ao inicializar Firestore:", e);
    throw e;
  }
}

export const firestoreDbClient = {
  getAccounts: async (userId: string): Promise<Account[]> => {
    const db = await getDb();
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db, 'accounts'), where('userId', '==', userId));
    const snap = await getDocs(q);
    // Fix: Explicitly using the Account type for casting
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Account));
  },

  addAccount: async (data: any) => {
    const db = await getDb();
    const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    const docRef = await addDoc(collection(db, 'accounts'), { 
      ...data, createdAt: serverTimestamp() 
    });
    return { id: docRef.id, ...data };
  },

  updateAccount: async (id: string, data: any) => {
    const db = await getDb();
    const { doc, updateDoc } = (await import('firebase/firestore')) as any;
    const ref = doc(db, 'accounts', id);
    await updateDoc(ref, data);
  },

  deleteAccount: async (id: string) => {
    const db = await getDb();
    const { doc, deleteDoc } = (await import('firebase/firestore')) as any;
    await deleteDoc(doc(db, 'accounts', id));
  },

  getCategories: async (userId: string): Promise<Category[]> => {
    const db = await getDb();
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db, 'categories'), where('userId', '==', userId));
    const snap = await getDocs(q);
    // Fix: Explicitly using the Category type for casting
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Category));
  },

  // Fix: createCategory implementation to ensure consistency with Category types
  createCategory: async (userId: string, name: string, direction: any) => {
    const db = await getDb();
    const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    const docRef = await addDoc(collection(db, 'categories'), { 
      userId, name, direction, createdAt: serverTimestamp() 
    });
    return docRef.id;
  },

  getTransactions: async (userId: string): Promise<Transaction[]> => {
    const db = await getDb();
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db, 'transactions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    // Fix: Explicitly using the Transaction type for casting
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Transaction));
  },

  addTransaction: async (data: any) => {
    const db = await getDb();
    const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    const docRef = await addDoc(collection(db, 'transactions'), { 
      ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() 
    });
    return { id: docRef.id, ...data };
  },

  updateTransaction: async (id: string, data: any) => {
    const db = await getDb();
    const { doc, updateDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    const ref = doc(db, 'transactions', id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  },

  deleteTransaction: async (id: string) => {
    const db = await getDb();
    const { doc, deleteDoc } = (await import('firebase/firestore')) as any;
    await deleteDoc(doc(db, 'transactions', id));
  },

  getDebts: async (userId: string): Promise<Debt[]> => {
    const db = await getDb();
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db, 'debts'), where('userId', '==', userId));
    const snap = await getDocs(q);
    // Fix: Explicitly using the Debt type for casting
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Debt));
  },

  getGoals: async (userId: string): Promise<Goal[]> => {
    const db = await getDb();
    const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
    const q = query(collection(db, 'goals'), where('userId', '==', userId));
    const snap = await getDocs(q);
    // Fix: Explicitly using the Goal type for casting
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Goal));
  }
};
