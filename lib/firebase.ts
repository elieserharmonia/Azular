
// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { isAiStudioPreview } from "../utils/env";

const firebaseConfig = {
  apiKey: "AIzaSyAzL6XU1p62YK0Nc5uMwcofHegTwW_Eoig",
  authDomain: "financeiro-domestico-d0bde.firebaseapp.com",
  projectId: "financeiro-domestico-d0bde",
  storageBucket: "financeiro-domestico-d0bde.appspot.com",
  messagingSenderId: "903140061132",
  appId: "1:903140061132:web:20611e8ba37400fce0f769",
};

/**
 * ⚠️ IMPORTANTE: Firebase Auth e Firestore NÃO devem ser importados aqui.
 * Isso impede que o app trave no ambiente restrito do Google AI Studio.
 */

// Singleton App Core
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Flag central de ambiente
export const firebaseEnabled = !isAiStudioPreview();
