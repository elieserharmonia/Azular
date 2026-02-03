
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAzL6XU1p62YK0Nc5uMwcofHegTwW_Eoig",
  authDomain: "financeiro-domestico-d0bde.firebaseapp.com",
  projectId: "financeiro-domestico-d0bde",
  storageBucket: "financeiro-domestico-d0bde.appspot.com",
  messagingSenderId: "903140061132",
  appId: "1:903140061132:web:20611e8ba37400fce0f769",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Persistência offline segura
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    console.warn("Azular DB: Persistência desativada", err.code);
  });
}

// Analytics com tratamento de erro silencioso
export let analytics = null;
if (typeof window !== 'undefined') {
    isSupported().then(supported => {
      if (supported) {
        try {
          analytics = getAnalytics(app);
        } catch (e) {}
      }
    }).catch(() => {});
}
