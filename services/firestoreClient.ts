import { app, firebaseEnabled } from "../lib/firebase";

let dbInstance: any = null;

/**
 * Retorna a instância do DB apenas se o Firebase estiver habilitado.
 * Implementa padrão Singleton para evitar erros de inicialização múltipla.
 */
export async function getDb() {
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