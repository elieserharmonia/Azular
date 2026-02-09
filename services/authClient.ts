
// src/services/authClient.ts
// Fix: Use getFirebaseApp instead of non-existent app export
import { getFirebaseApp, firebaseEnabled } from "../lib/firebase";

/**
 * ⚠️ IMPORTANTE: Auth é carregado sob demanda.
 */
export async function getAuthClient() {
  if (!firebaseEnabled) {
    throw new Error("AUTH_DISABLED_IN_PREVIEW");
  }

  const app = await getFirebaseApp();
  const { getAuth } = await import("firebase/auth");
  return getAuth(app);
}