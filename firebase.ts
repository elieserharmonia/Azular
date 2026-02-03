
import { initializeApp } from "firebase/app";
// Use standard modular imports for Auth and Firestore from the Firebase SDK
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAzL6XU1p62YK0Nc5uMwcofHegTwW_Eoig",
  authDomain: "financeiro-domestico-d0bde.firebaseapp.com",
  projectId: "financeiro-domestico-d0bde",
  storageBucket: "financeiro-domestico-d0bde.appspot.com",
  messagingSenderId: "903140061132",
  appId: "1:903140061132:web:20611e8ba37400fce0f769",
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// EXPORTES QUE O APP PRECISA
// getAuth and getFirestore are the correct modular exports for Firebase v9+
export const auth = getAuth(app);
export const db = getFirestore(app);
