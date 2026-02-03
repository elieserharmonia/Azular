
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

// Inicialização segura
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Habilitar persistência offline (IndexedDB)
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Azular: Persistência falhou (múltiplas abas)");
    } else if (err.code === 'unimplemented') {
      console.warn("Azular: Navegador não suporta offline");
    }
  });
}

// Analytics Blindado contra erros e bloqueadores
export let analytics = null;
if (typeof window !== 'undefined') {
    isSupported().then(supported => {
      if (supported) {
        try {
          analytics = getAnalytics(app);
        } catch (e) {
          console.warn("Azular: Analytics bloqueado ou falhou.");
        }
      }
    }).catch(err => {
      console.warn("Azular: Erro ao checar isSupported() para Analytics");
    });
}
