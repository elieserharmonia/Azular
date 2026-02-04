
// src/services/firestoreClient.ts
import { app, firebaseEnabled } from "../lib/firebase";

let dbInstance: any = null;

/**
 * ⚠️ IMPORTANTE: Firestore é carregado sob demanda.
 */
export async function getDb() {
  if (!firebaseEnabled) {
    throw new Error("FIRESTORE_DISABLED_IN_PREVIEW");
  }

  if (dbInstance) return dbInstance;

  // Import dinâmico evita erros de registro de componente no boot
  const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } = await import("firebase/firestore");
  
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });

  return dbInstance;
}
