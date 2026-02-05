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

  // Fix: cast dynamic firestore import to any to resolve property access errors
  const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } = (await import("firebase/firestore")) as any;
  
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });

  return dbInstance;
}