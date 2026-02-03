
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAzL6XU1p62YK0Nc5uMwcofHegTwW_Eoig",
  authDomain: "financeiro-domestico-d0bde.firebaseapp.com",
  projectId: "financeiro-domestico-d0bde",
  storageBucket: "financeiro-domestico-d0bde.appspot.com",
  messagingSenderId: "903140061132",
  appId: "1:903140061132:web:20611e8ba37400fce0f769",
};

// Inicialização segura do App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Nova forma de configurar cache persistente (Substitui enableMultiTabIndexedDbPersistence)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Analytics com tratamento de erro absoluto
export let analytics = null;
if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    isSupported().then(supported => {
      if (supported) {
        try {
          analytics = getAnalytics(app);
        } catch (e) {
          console.warn("Azular Analytics: falha silenciosa ao iniciar.", e);
        }
      }
    }).catch(() => {});
}
