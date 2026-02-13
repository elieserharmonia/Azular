
import { firebaseEnabled, getFirebaseApp } from '../lib/firebase';
import { dbClient } from './dbClient';
import { Category } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';

function isPlainObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
}

/**
 * Remove undefined, troca NaN por null, e normaliza strings vazias.
 * (Firestore odeia undefined / NaN)
 */
export function sanitizeForFirestore<T extends Record<string, any>>(input: T): T {
  const out: any = Array.isArray(input) ? [] : {};

  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;

    if (typeof v === "number" && Number.isNaN(v)) {
      out[k] = null;
      continue;
    }

    if (typeof v === "string" && v.trim() === "") {
      out[k] = null;
      continue;
    }

    if (Array.isArray(v)) {
      out[k] = v.map((x) => (isPlainObject(x) ? sanitizeForFirestore(x) : x));
      continue;
    }

    if (isPlainObject(v)) {
      out[k] = sanitizeForFirestore(v);
      continue;
    }

    out[k] = v;
  }

  return out;
}

export const getAccounts = (userId: string) => dbClient.getAccounts(userId);
export const addAccount = (data: any) => dbClient.addAccount(data);
export const updateAccount = (id: string, data: any) => dbClient.updateAccount(id, data);
export const deleteAccount = (id: string) => dbClient.deleteAccount(id);

/**
 * Retorna categorias do usuário misturadas com as padrões caso não existam.
 */
export const getCategories = async (userId: string): Promise<Category[]> => {
  const userCats = await dbClient.getCategories(userId);
  
  // Garantir sementes se necessário (no Firestore isso geralmente é feito no signup)
  if (userCats.length === 0 && firebaseEnabled) {
    // Para simplificar, o localDbClient já trata sementes.
    // No Firestore, retornamos os padrões se o usuário não tiver nada.
    return DEFAULT_CATEGORIES.map((c, i) => ({
      ...c,
      id: `default-${i}`,
      userId,
      direction: c.direction as any,
      createdAt: new Date().toISOString()
    }));
  }

  // Ordenação: Alfabética, com "Outros" por último
  return userCats.sort((a, b) => {
    if (a.name === 'Outros') return 1;
    if (b.name === 'Outros') return -1;
    return a.name.localeCompare(b.name);
  });
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
