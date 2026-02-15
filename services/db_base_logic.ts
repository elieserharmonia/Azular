// services/db_base_logic.ts
import { firebaseEnabled } from '../lib/firebase';
import { dbClient } from './dbClient';
import { Category, Subcategory } from '../types';
import { OFFICIAL_SEEDS } from '../constants';
import { getFirestoreModule } from '../lib/firebaseModules';

export function normalizeName(name: string): string {
  return name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export const seedCategoriesIfEmpty = async (userId: string) => {
  try {
    const existing = await dbClient.getCategories(userId);
    const existingNormalized = new Set(existing.map(c => normalizeName(c.name)));

    for (const seed of OFFICIAL_SEEDS) {
      const sNameNorm = normalizeName(seed.name);
      if (!existingNormalized.has(sNameNorm)) {
        const catId = await dbClient.createCategory(userId, seed.name, seed.direction as any);
        if (firebaseEnabled && catId) {
          try {
            const { getDb } = await import('./firestoreClient');
            const { doc, updateDoc } = await getFirestoreModule();
            const db = await getDb();
            await updateDoc(doc(db, 'categories', catId), {
              iconKey: seed.iconKey,
              colorKey: seed.colorKey,
              isSystem: true,
              sortOrder: seed.name === 'Outros' ? 999 : 0
            });
          } catch (e) {}
        }
      }
    }
  } catch (err) {}
};

export const getAccounts = (userId: string) => dbClient.getAccounts(userId);
export const addAccount = (data: any) => dbClient.addAccount(data);
export const updateAccount = (id: string, data: any) => dbClient.updateAccount(id, data);
export const deleteAccount = (id: string) => dbClient.deleteAccount(id);

export const getCategories = async (userId: string): Promise<Category[]> => {
  try {
    let userCats = await dbClient.getCategories(userId);
    if (userCats.length === 0) {
      await seedCategoriesIfEmpty(userId);
      userCats = await dbClient.getCategories(userId);
    }
    return userCats.sort((a, b) => {
      if (a.name.toLowerCase() === 'outros') return 1;
      if (b.name.toLowerCase() === 'outros') return -1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  } catch (err) {
    return [];
  }
};

export const getSubcategories = async (userId: string, categoryId: string): Promise<Subcategory[]> => {
  if (!firebaseEnabled) return [];
  try {
    const { getDb } = await import('./firestoreClient');
    const { collection, query, where, getDocs } = await getFirestoreModule();
    const db = await getDb();
    const q = query(collection(db, 'subcategories'), where('categoryId', '==', categoryId));
    const snap = await getDocs(q);
    return snap.docs
      .map((doc: any) => ({ id: doc.id, ...doc.data() } as Subcategory))
      .sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR'));
  } catch (err) {
    return [];
  }
};

export const createCategory = (userId: string, name: string, direction: any) =>
  dbClient.createCategory(userId, name, direction);

export const saveUserProfile = async (uid: string, data: any) => {
  if (!firebaseEnabled) return;
  try {
    const { getDb } = await import('./firestoreClient');
    const { doc, setDoc, serverTimestamp } = await getFirestoreModule();
    const db = await getDb();
    return setDoc(
      doc(db, 'users', uid),
      { ...data, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    throw err;
  }
};

/**
 * ✅ LIMPA BASE DO USUÁRIO NO FIRESTORE (produção)
 * Apaga documentos onde userId == uid em coleções principais + users/{uid}
 */
export const wipeUserData = async (userId: string) => {
  // Preview/local
  if (!firebaseEnabled && 'resetUser' in dbClient) {
    return (dbClient as any).resetUser(userId);
  }

  // Produção / Firestore
  if (!firebaseEnabled) return { deletedCount: 0, message: "Firebase desabilitado." };

  const { getDb } = await import('./firestoreClient');
  const firestore = await getFirestoreModule();
  const db = await getDb();

  // Alguns helpers podem não vir no wrapper, então garantimos via import direto se necessário
  const fallback = await import('firebase/firestore');

  const collection = (firestore as any).collection ?? fallback.collection;
  const query = (firestore as any).query ?? fallback.query;
  const where = (firestore as any).where ?? fallback.where;
  const getDocs = (firestore as any).getDocs ?? fallback.getDocs;
  const writeBatch = (firestore as any).writeBatch ?? fallback.writeBatch;
  const doc = (firestore as any).doc ?? fallback.doc;

  // Limites do batch do Firestore (500). Vamos usar 450 por segurança.
  const BATCH_LIMIT = 450;

  async function deleteByUserId(collectionName: string) {
    let deleted = 0;

    while (true) {
      const q = query(collection(db, collectionName), where('userId', '==', userId));
      const snap = await getDocs(q);

      if (snap.empty) break;

      let batch = writeBatch(db);
      let countInBatch = 0;

      for (const d of snap.docs) {
        batch.delete(d.ref);
        deleted++;
        countInBatch++;

        if (countInBatch >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(db);
          countInBatch = 0;
        }
      }

      if (countInBatch > 0) {
        await batch.commit();
      }

      // loop novamente para garantir que não sobrou nada (e para coleções grandes)
      // (o snap é “por consulta”, então repetimos até esvaziar)
    }

    return deleted;
  }

  // Coleções onde seus dados ficam (ajuste se você tiver outras)
  const collectionsToWipe = [
    'transactions',
    'accounts',
    'categories',
    'goals',
    'goalContributions',
    'debts',
    // 'subcategories' // só se tiver userId nelas; hoje você busca por categoryId
  ];

  let deletedCount = 0;

  for (const c of collectionsToWipe) {
    try {
      deletedCount += await deleteByUserId(c);
    } catch (e) {
      // Se alguma coleção não existir, apenas ignora
      // (isso evita travar em bases em fase de testes)
    }
  }

  // Apaga também o perfil do usuário (opcional, mas normalmente desejado)
  try {
    const b = writeBatch(db);
    b.delete(doc(db, 'users', userId));
    await b.commit();
    deletedCount += 1;
  } catch (e) {}

  return { deletedCount, message: "Base limpa com sucesso." };
};
