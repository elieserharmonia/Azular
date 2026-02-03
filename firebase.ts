
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

// Habilitar persistência offline (IndexedDB)
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Azular: Persistência falhou (múltiplas abas abertas)");
    } else if (err.code === 'unimplemented') {
      console.warn("Azular: O navegador não suporta persistência offline");
    }
  });
}

// Proteção Crítica para Analytics no Android
export let analytics = null;
isSupported().then(supported => {
  if (supported && typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    try {
      analytics = getAnalytics(app);
      console.log("Azular: Analytics carregado.");
    } catch (e) {
      console.warn("Azular: Analytics bloqueado.", e);
    }
  }
}).catch(err => {
  console.error("Azular: Erro Analytics", err);
});
