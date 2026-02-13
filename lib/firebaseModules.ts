
/**
 * Utilitários para carregamento dinâmico do Firebase.
 * Isso impede que o bundle inicial contenha todo o peso do SDK.
 */

export async function getAuthModule() {
  return await import('firebase/auth');
}

export async function getFirestoreModule() {
  return await import('firebase/firestore');
}

export async function getAppModule() {
  return await import('firebase/app');
}
