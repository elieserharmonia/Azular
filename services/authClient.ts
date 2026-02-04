
// src/services/authClient.ts
import { app, firebaseEnabled } from "../lib/firebase";

/**
 * ⚠️ IMPORTANTE: Auth é carregado sob demanda.
 */
export async function getAuthClient() {
  if (!firebaseEnabled) {
    throw new Error("AUTH_DISABLED_IN_PREVIEW");
  }

  const { getAuth } = await import("firebase/auth");
  return getAuth(app);
}
