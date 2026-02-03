
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

// Proteção Crítica para Analytics no Android
export let analytics = null;
isSupported().then(supported => {
  if (supported && typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    try {
      analytics = getAnalytics(app);
      console.log("Azular: Analytics carregado com sucesso.");
    } catch (e) {
      console.warn("Azular: Analytics bloqueado por protocolo ou erro de inicialização.", e);
    }
  } else {
    console.log("Azular: Analytics desativado (Ambiente Mobile/File)");
  }
}).catch(err => {
  console.error("Azular: Erro ao verificar suporte de Analytics", err);
});
