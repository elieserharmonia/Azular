
import { firebaseEnabled } from '../lib/firebase';
import { dbClient } from './dbClient';
import { Category, Subcategory } from '../types';
import { OFFICIAL_SEEDS } from '../constants';

function normalizeName(name: string) {
  return name.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Garante que o usuário tenha as categorias padrão do sistema.
 */
export const seedCategoriesIfEmpty = async (userId: string) => {
  const existing = await dbClient.getCategories(userId);
  const existingNames = new Set(existing.map(c => normalizeName(c.name)));

  const categoriesToCreate = OFFICIAL_SEEDS.filter(s => !existingNames.has(normalizeName(s.name)));

  if (categoriesToCreate.length === 0) return;

  for (const seed of categoriesToCreate) {
    const categoryData = {
      userId,
      name: seed.name,
      direction: seed.direction as any,
      iconKey: seed.iconKey,
      colorKey: seed.colorKey,
      isSystem: true,
      sortOrder: seed.name === 'Outros' ? 999 : 0,
      createdAt: new Date().toISOString()
    };
    
    const catId = await dbClient.createCategory(userId, categoryData.name, categoryData.direction);
    
    // Se houver subcategorias no seed, e o dbClient suportar (ou via Firestore direto)
    if (seed.subcategories.length > 0 && firebaseEnabled) {
      const { getDb } = await import('./firestoreClient');
      const { collection, addDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
      const db = await getDb();
      
      for (const subName of seed.subcategories) {
        await addDoc(collection(db, 'subcategories'), {
          categoryId: catId,
          userId,
          name: subName,
          isSystem: true,
          sortOrder: 0,
          createdAt: serverTimestamp()
        });
      }
    }
  }
};

export const getAccounts = (userId: string) => dbClient.getAccounts(userId);
export const addAccount = (data: any) => dbClient.addAccount(data);
export const updateAccount = (id: string, data: any) => dbClient.updateAccount(id, data);
export const deleteAccount = (id: string) => dbClient.deleteAccount(id);

export const getCategories = async (userId: string): Promise<Category[]> => {
  const userCats = await dbClient.getCategories(userId);
  
  if (userCats.length === 0) {
    await seedCategoriesIfEmpty(userId);
    return getCategories(userId);
  }

  return userCats.sort((a, b) => {
    if (a.name === 'Outros') return 1;
    if (b.name === 'Outros') return -1;
    return a.name.localeCompare(b.name);
  });
};

export const getSubcategories = async (userId: string, categoryId: string): Promise<Subcategory[]> => {
  if (!firebaseEnabled) return []; // Mock local se necessário
  
  const { getDb } = await import('./firestoreClient');
  const { collection, query, where, getDocs } = (await import('firebase/firestore')) as any;
  const db = await getDb();
  
  const q = query(collection(db, 'subcategories'), where('categoryId', '==', categoryId));
  const snap = await getDocs(q);
  return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Subcategory))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));
};

export const createCategory = (userId: string, name: string, direction: any) => 
  dbClient.createCategory(userId, name, direction);

export const saveUserProfile = async (uid: string, data: any) => {
  if (!firebaseEnabled) {
    localStorage.setItem('azular_preview_profile', JSON.stringify({ uid, ...data }));
    return;
  }

  try {
    const db = await (import('./firestoreClient').then(m => m.getDb()));
    const { doc, setDoc, serverTimestamp } = (await import('firebase/firestore')) as any;
    return setDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error("Error saving user profile to Firestore:", err);
    throw err;
  }
};

export const wipeUserData = async (userId: string) => {
  if (!firebaseEnabled && 'resetUser' in dbClient) {
    return (dbClient as any).resetUser(userId);
  }
  
  return { 
    deletedCount: 0, 
    message: "Limpeza completa não suportada diretamente via Client SDK para Firestore." 
  };
};
