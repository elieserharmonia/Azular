
import { getFirebaseApp, firebaseEnabled } from "../lib/firebase";
import { getFirestoreModule } from "../lib/firebaseModules";

let dbInstance: any = null;

/**
 * Retorna a instância do DB apenas se o Firebase estiver habilitado.
 */
export async function getDb() {
  const app = await getFirebaseApp();
  if (!firebaseEnabled || !app) throw new Error("FIRESTORE_DISABLED_IN_PREVIEW");

  if (dbInstance) return dbInstance;

  try {
    const { 
      getFirestore, 
      initializeFirestore, 
      persistentLocalCache, 
      persistentMultipleTabManager 
    } = await getFirestoreModule();
    
    try {
      dbInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch (e: any) {
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
