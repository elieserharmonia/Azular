// src/services/firestoreClient.ts
import { app, firebaseEnabled } from "../lib/firebase";

let dbInstance: any = null;

/**
 * Retorna a instância do DB apenas se o Firebase estiver habilitado.
 * Lança erro específico para ser capturado pela fachada de dados.
 */
export async function getDb() {
  if (!firebaseEnabled) {
    throw new Error("FIRESTORE_DISABLED_IN_PREVIEW");
  }

  if (dbInstance) return dbInstance;

  try {
    const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } = (await import("firebase/firestore")) as any;
    
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });

    return dbInstance;
  } catch (e) {
    console.warn("Falha ao inicializar Firestore:", e);
    throw e;
  }
}