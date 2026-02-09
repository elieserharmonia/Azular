
import { isPreview } from "../utils/env";

/**
 * CONFIGURAÇÃO DO FIREBASE
 * Só é executada se NÃO for ambiente de preview.
 */
const firebaseConfig = {
  apiKey: "AIzaSyAzL6XU1p62YK0Nc5uMwcofHegTwW_Eoig",
  authDomain: "financeiro-domestico-d0bde.firebaseapp.com",
  projectId: "financeiro-domestico-d0bde",
  storageBucket: "financeiro-domestico-d0bde.appspot.com",
  messagingSenderId: "903140061132",
  appId: "1:903140061132:web:20611e8ba37400fce0f769",
};

const isPre = isPreview();

// Flag global para o sistema
export const firebaseEnabled = !isPre;

// Instâncias carregadas sob demanda (Lazy)
let appInstance: any = null;

export const getFirebaseApp = async () => {
  if (!firebaseEnabled) return null;
  if (appInstance) return appInstance;

  const { initializeApp, getApps, getApp } = await import("firebase/app");
  appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return appInstance;
};
