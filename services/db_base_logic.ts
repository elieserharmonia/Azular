import { dbClient } from './dbClient.ts';
import { getDb } from './firestoreClient.ts';
import { firebaseEnabled } from '../lib/firebase.ts';
import { safeStorage } from '../utils/storage.ts';

export const getAccounts = (userId: string) => dbClient.getAccounts(userId);
export const addAccount = (data: any) => dbClient.addAccount(data);
export const updateAccount = (id: string, data: any) => dbClient.updateAccount(id, data);
export const deleteAccount = (id: string) => dbClient.deleteAccount(id);
export const getCategories = (userId: string) => dbClient.getCategories(userId);

export const createCategory = async (userId: string, name: string, direction: any) => {
  if ('createCategory' in dbClient) {
    return (dbClient as any).createCategory(userId, name, direction);
  } else if ('addCategory' in dbClient) {
    return (dbClient as any).addCategory(userId, name, direction);
  }
  throw new Error("createCategory not implemented in current dbClient");
};

export const saveUserProfile = async (uid: string, data: any) => {
  if (!firebaseEnabled) {
    const profileStr = safeStorage.get('azular_preview_profile') || '{}';
    let profile = {};
    try {
      profile = JSON.parse(profileStr);
    } catch (e) {
      profile = {};
    }
    const newProfile = { ...profile, ...data, uid };
    safeStorage.set('azular_preview_profile', JSON.stringify(newProfile));
    return;
  }
  
  try {
    const db = await getDb();
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