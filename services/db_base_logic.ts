
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
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Subcategory))
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
    return setDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    throw err;
  }
};

export const wipeUserData = async (userId: string) => {
  if (!firebaseEnabled && 'resetUser' in dbClient) {
    return (dbClient as any).resetUser(userId);
  }
  return { deletedCount: 0, message: "Apenas via admin." };
};
