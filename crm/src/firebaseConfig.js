// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
<<<<<<< HEAD
=======
import { getMessaging, isSupported } from "firebase/messaging";
>>>>>>> a7c9ca3f (Atualizações multilojas - correções locais)

const firebaseConfig = {
  apiKey: "AIzaSyCNU5ZEl60OcW5eZyL_ZoD0tFKpweQvhwU",
  authDomain: "crmdoceria-9959e.firebaseapp.com",
  projectId: "crmdoceria-9959e",
  storageBucket: "crmdoceria-9959e.firebasestorage.app",
  messagingSenderId: "389481198252",
  appId: "1:389481198252:web:429bff3cc5d4f353bea509",
  measurementId: "G-XJ7LPG0229"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa os serviços
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'us-central1');

<<<<<<< HEAD

=======
let messagingPromise = Promise.resolve(null);

if (typeof window !== 'undefined') {
  messagingPromise = isSupported()
    .then((supported) => {
      if (!supported) {
        console.warn('Firebase messaging não é suportado neste navegador.');
        return null;
      }
      return getMessaging(app);
    })
    .catch((error) => {
      console.warn('Falha ao inicializar o Firebase Messaging:', error);
      return null;
    });
}
>>>>>>> a7c9ca3f (Atualizações multilojas - correções locais)

// Configuração adicional para desenvolvimento
if (process.env.NODE_ENV === 'development') {
  console.log('Firebase configurado para:', firebaseConfig.projectId);
}
export { firebaseConfig };
<<<<<<< HEAD
export { auth, db, storage, functions };
=======
export { auth, db, storage, functions, messagingPromise };
>>>>>>> a7c9ca3f (Atualizações multilojas - correções locais)
