import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import * as firestore from "firebase/firestore";
import { isPreview } from "../utils/env";

const firebaseConfig = {
  apiKey: "AIzaSyAzL6XU1p62YK0Nc5uMwcofHegTwW_Eoig",
  authDomain: "financeiro-domestico-d0bde.firebaseapp.com",
  projectId: "financeiro-domestico-d0bde",
  storageBucket: "financeiro-domestico-d0bde.appspot.com",
  messagingSenderId: "903140061132",
  appId: "1:903140061132:web:20611e8ba37400fce0f769",
};

// Detecção de ambiente segura
const isPre = isPreview();

// No Preview, NÃO exportamos nenhuma instância funcional do Firebase
export const app = isPre ? null : (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig));
export const auth = isPre ? null : (app ? getAuth(app) : null);
export const db = isPre ? null : (app ? (firestore as any).getFirestore(app) : null);
export const firebaseEnabled = !isPre && !!app;