
import { firebaseEnabled } from '../lib/firebase';
import { getDb } from './firestoreClient';
import { localDbClient } from './localDbClient';
import { Transaction, Account, Category, Goal, Debt, UserProfile } from '../types';
import { addMonthsToMonthKey } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';
import { DEFAULT_CATEGORIES } from '../constants';

/**
 * HELPER: Calcula range de meses para busca (Tarefa A - Regra 2)
 */
const getMonthKeyRange = (centerMonth: string, back = 24, forward = 24) => {
  const fromMonth = addMonthsToMonthKey(centerMonth, -back);
  const toMonth = addMonthsToMonthKey(centerMonth, forward);
  return { fromMonth, toMonth };
};

/**
 * TAREFA A - GARANTIR CONSISTÊNCIA DA SÉRIE (SeriesSync v2)
 */
export const ensureSeriesConsistency = async (currentDoc: Transaction): Promise<string> => {
  const uid = currentDoc.userId;
  const currentGroupId = currentDoc.recurrenceGroupId;

  const allTxs = await getTransactions(uid);
  const existingInGroup = allTxs.filter(t => t.recurrenceGroupId === currentGroupId && currentGroupId);

  if (existingInGroup.length > 1) {
    return currentGroupId!;
  }

  const currentVal = parseNumericValue(currentDoc.plannedAmount || currentDoc.amount);
  const { fromMonth, toMonth } = getMonthKeyRange(currentDoc.competenceMonth);
  
  const candidates = allTxs.filter(t => {
    const isSameUser = t.userId === uid;
    const isPlanned = t.status === 'planned';
    const isSameType = t.type === currentDoc.type;
    const isSameAccount = t.accountId === currentDoc.accountId;
    const isSameCategory = t.categoryId === currentDoc.categoryId;
    const isRecurringFlag = t.isRecurring === true || !!t.recurrence;
    const isSameDesc = t.description.toLowerCase().trim() === currentDoc.description.toLowerCase().trim();
    const tVal = parseNumericValue(t.plannedAmount || t.amount);
    const diff = Math.abs(tVal - currentVal);
    const isSimilarValue = currentVal === 0 ? tVal === 0 : (diff / currentVal) <= 0.02;
    const isInTimeRange = t.competenceMonth >= fromMonth && t.competenceMonth <= toMonth;

    return isSameUser && isPlanned && isSameType && isSameAccount && isSameCategory && 
           isRecurringFlag && isSameDesc && isSimilarValue && isInTimeRange;
  });

  if (candidates.length > 120) {
    throw new Error('SERIES_TOO_LARGE');
  }

  if (candidates.length <= 1) {
    return currentGroupId || `rg-${Math.random().toString(36).substring(2, 9)}`;
  }

  const finalGroupId = currentGroupId || `rg-${Math.random().toString(36).substring(2, 9)}`;
  const targetIds = candidates.map(c => c.id!).filter(id => !!id);
  
  if (firebaseEnabled) {
    const db = await getDb();
    const { doc, writeBatch, serverTimestamp } = (await import('firebase/firestore')) as any;
    const batch = writeBatch(db);
    targetIds.forEach(id => {
      batch.update(doc(db, 'transactions', id), {
        recurrenceGroupId: finalGroupId,
        isRecurring: true,
        updatedAt: serverTimestamp()
      });
    });
    await batch.commit();
  } else {
    await localDbClient.bulkUpdateTransactions(targetIds, { 
      recurrenceGroupId: finalGroupId, 
      isRecurring: true 
    });
  }

  return finalGroupId;
};

/**
 * TAREFA B - EXCLUIR RECORRÊNCIA EM LOTE
 */
export const deleteRecurringSeries = async (params: {
  currentTx: Transaction,
  mode: 'single' | 'from' | 'all' | 'range',
  fromMonth?: string,
  toMonth?: string
}) => {
  const { currentTx, mode, fromMonth, toMonth } = params;
  const groupId = await ensureSeriesConsistency(currentTx);
  const allTxs = await getTransactions(currentTx.userId);
  const series = allTxs.filter(t => t.recurrenceGroupId === groupId && t.status === 'planned');

  let targetIds: string[] = [];

  switch (mode) {
    case 'single': targetIds = [currentTx.id!]; break;
    case 'from':
      const start = fromMonth || currentTx.competenceMonth;
      targetIds = series.filter(t => t.competenceMonth >= start).map(t => t.id!);
      break;
    case 'all': targetIds = series.map(t => t.id!); break;
    case 'range':
      if (fromMonth && toMonth) {
        targetIds = series.filter(t => t.competenceMonth >= fromMonth && t.competenceMonth <= toMonth).map(t => t.id!);
      }
      break;
  }

  if (targetIds.length === 0) return { deletedCount: 0 };

  if (firebaseEnabled) {
    const db = await getDb();
    const { doc, writeBatch } = (await import('firebase/firestore')) as any;
    const CHUNK_SIZE = 300;
    for (let i = 0; i < targetIds.length; i += CHUNK_SIZE) {
      const chunk = targetIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(id => batch.delete(doc(db, 'transactions', id)));
      await batch.commit();
    }
    return { deletedCount: targetIds.length };
  } else {
    return localDbClient.bulkDeleteTransactions(targetIds);
  }
};

/**
 * RESET TOTAL DO USUÁRIO (Wipe My Data)
 * Agora limpa e re-semeia as categorias padrão.
 */
export const wipeUserData = async (userId: string): Promise<{ deletedCount: number }> => {
  if (!userId) throw new Error("Usuário não identificado.");

  if (!firebaseEnabled) {
    // No modo local, o resetUser já limpa. O localDbClient re-semeia no getCategories.
    await localDbClient.resetUser(userId);
    return { deletedCount: 0 };
  }

  try {
    const db = await getDb();
    const { collection, query, where, getDocs, doc, writeBatch, serverTimestamp, addDoc } = (await import('firebase/firestore')) as any;
    
    const collectionsToWipe = ['transactions', 'accounts', 'categories', 'debts', 'goals', 'goalContributions'];
    let totalDeleted = 0;
    const CHUNK_SIZE = 300;

    for (const collName of collectionsToWipe) {
      const q = query(collection(db, collName), where('userId', '==', userId));
      const snap = await getDocs(q);
      const docs = snap.docs;
      if (docs.length === 0) continue;

      for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const chunk = docs.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((d: any) => batch.delete(d.ref));
        await batch.commit();
        totalDeleted += chunk.length;
      }
    }

    // RE-SEMEAR CATEGORIAS PADRÃO (Aquelas em ordem alfabética)
    for (const cat of DEFAULT_CATEGORIES) {
      await addDoc(collection(db, 'categories'), {
        ...cat,
        userId,
        createdAt: serverTimestamp()
      });
    }

    // Resetar perfil parcial
    const userRef = doc(db, 'users', userId);
    const profileBatch = writeBatch(db);
    profileBatch.update(userRef, {
      fullName: '',
      phone: '',
      birthDate: '',
      avatarUrl: null,
      address: {},
      updatedAt: serverTimestamp()
    });
    await profileBatch.commit();

    return { deletedCount: totalDeleted };
  } catch (err) {
    console.error("Erro ao limpar dados do usuário:", err);
    throw err;
  }
};

/**
 * RESTANTE DAS FUNÇÕES DE ACESSO
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

export const addProvisionSeries = async (payloadBase: Partial<Transaction>) => {
  const startMonth = payloadBase.competenceMonth || '';
  const mode = payloadBase.recurrenceMode || 'none';
  const groupId = Math.random().toString(36).substring(2, 15);
  
  let monthsToCreate = 1;
  if (mode === 'count') {
    monthsToCreate = payloadBase.recurrenceCount || 1;
  } else if (mode === 'until') {
    const end = payloadBase.recurrenceEndMonth || startMonth;
    const [sY, sM] = startMonth.split('-').map(Number);
    const [eY, eM] = end.split('-').map(Number);
    monthsToCreate = (eY - sY) * 12 + (eM - sM) + 1;
  }

  const promises = [];
  for (let i = 0; i < monthsToCreate; i++) {
    const currentMonth = addMonthsToMonthKey(startMonth, i);
    const item = {
      ...payloadBase,
      competenceMonth: currentMonth,
      recurrenceGroupId: groupId,
      isRecurring: true,
      recurrenceStartMonth: startMonth
    };
    promises.push(addTransaction(item));
  }
  return Promise.all(promises);
};

export const updateProvisionSeries = async (
  currentTx: Transaction, 
  updatedFields: Partial<Transaction>, 
  scope: 'current' | 'forward' | 'all'
) => {
  const groupId = await ensureSeriesConsistency(currentTx);
  const txs = await getTransactions(currentTx.userId);
  const series = txs.filter(t => t.recurrenceGroupId === groupId);
  
  let targetIds: string[] = [];
  if (scope === 'current') {
    targetIds = [currentTx.id!];
  } else if (scope === 'forward') {
    targetIds = series.filter(t => t.competenceMonth >= currentTx.competenceMonth).map(t => t.id!);
  } else if (scope === 'all') {
    targetIds = series.map(t => t.id!);
  }

  if (firebaseEnabled) {
    const db = await getDb();
    const { doc, writeBatch, serverTimestamp } = (await import('firebase/firestore')) as any;
    const batch = writeBatch(db);
    targetIds.forEach(id => batch.update(doc(db, 'transactions', id), { ...updatedFields, updatedAt: serverTimestamp() }));
    await batch.commit();
  } else {
    await localDbClient.bulkUpdateTransactions(targetIds, updatedFields);
  }
};

export const updateTransaction = async (id: string, data: Partial<Transaction>) => {
  if (!firebaseEnabled) return localDbClient.updateTransaction(id, data);
  try {
    const db = await getDb();
    const { doc, updateDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    return updateDoc(doc(db, 'transactions', id), { ...data, updatedAt: serverTimestamp() });
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
