
import { firebaseEnabled } from '../lib/firebase';
import { getDb } from './firestoreClient';
import { localDbClient } from './localDbClient';
import { Transaction, Account, Category, Goal, Debt, UserProfile } from '../types';
import { addMonthsToMonthKey } from '../utils/formatters';
import { parseNumericValue } from '../utils/number';

/**
 * TAREFA A - GARANTIR CONSISTÊNCIA DA SÉRIE
 * Localiza itens que deveriam estar no mesmo grupo mas estão "órfãos".
 */
export const ensureSeriesConsistency = async (currentDoc: Transaction): Promise<string> => {
  const uid = currentDoc.userId;
  const groupId = currentDoc.recurrenceGroupId || `rg-${Math.random().toString(36).substring(2, 9)}`;

  // 1. Verificar se o grupo já é consistente (tem > 1 item)
  const allTxs = await getTransactions(uid);
  const existingInGroup = allTxs.filter(t => t.recurrenceGroupId === currentDoc.recurrenceGroupId && t.recurrenceGroupId);

  if (existingInGroup.length > 1) {
    console.log(`[SeriesSync] Grupo ${groupId} já é consistente com ${existingInGroup.length} itens.`);
    return groupId;
  }

  // 2. Se só tem 1 item ou nenhum groupId, buscar "irmãos" por características
  console.log(`[SeriesSync] Corrigindo série para: ${currentDoc.description}`);
  
  const amount = parseNumericValue(currentDoc.plannedAmount || currentDoc.amount);
  
  // Candidatos: Mesmo User, Status Planned, Mesmo Tipo, Mesma Descrição, Mesmo Valor
  const candidates = allTxs.filter(t => 
    t.userId === uid &&
    t.status === 'planned' &&
    t.type === currentDoc.type &&
    t.description.toLowerCase().trim() === currentDoc.description.toLowerCase().trim() &&
    parseNumericValue(t.plannedAmount || t.amount) === amount &&
    t.categoryId === currentDoc.categoryId
  );

  if (candidates.length <= 1) {
    return groupId; // Não encontrou irmãos
  }

  // 3. Atualizar todos os candidatos com o novo/existente groupId
  const targetIds = candidates.map(c => c.id!).filter(id => !!id);
  
  if (firebaseEnabled) {
    const db = await getDb();
    const { doc, writeBatch, serverTimestamp } = (await import('firebase/firestore')) as any;
    const batch = writeBatch(db);
    targetIds.forEach(id => {
      batch.update(doc(db, 'transactions', id), {
        recurrenceGroupId: groupId,
        isRecurring: true,
        updatedAt: serverTimestamp()
      });
    });
    await batch.commit();
  } else {
    await localDbClient.bulkUpdateTransactions(targetIds, { 
      recurrenceGroupId: groupId, 
      isRecurring: true 
    });
  }

  console.log(`[SeriesSync] Série unificada com ${targetIds.length} meses.`);
  return groupId;
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
  
  // Primeiro, garante que a série está consistente
  const groupId = await ensureSeriesConsistency(currentTx);
  
  // Busca transações atualizadas (após sync)
  const allTxs = await getTransactions(currentTx.userId);
  const series = allTxs.filter(t => t.recurrenceGroupId === groupId);

  let targetIds: string[] = [];

  switch (mode) {
    case 'single':
      targetIds = [currentTx.id!];
      break;
    case 'from':
      const start = fromMonth || currentTx.competenceMonth;
      targetIds = series.filter(t => t.competenceMonth >= start).map(t => t.id!);
      break;
    case 'all':
      targetIds = series.map(t => t.id!);
      break;
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
    const batch = writeBatch(db);
    targetIds.forEach(id => batch.delete(doc(db, 'transactions', id)));
    await batch.commit();
    return { deletedCount: targetIds.length };
  } else {
    return localDbClient.bulkDeleteTransactions(targetIds);
  }
};

/**
 * FUNÇÕES DE ACESSO A DADOS (REPASSES)
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
  // Antes de atualizar, sincroniza a série se necessário
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
