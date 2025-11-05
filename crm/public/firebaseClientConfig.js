// --- SEÇÃO 1: IMPORTAÇÕES DO FIREBASE SDK ---
// Importa os módulos principais do Firebase.
<<<<<<< HEAD
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
=======
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
>>>>>>> a7c9ca3f (Atualizações multilojas - correções locais)

// Firestore (banco de dados NoSQL)
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where,
  serverTimestamp,
  setDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Autenticação Firebase
import { 
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


// --- SEÇÃO 2: CONFIGURAÇÃO DO PROJETO FIREBASE ---
// 🔐 Substitua essas chaves pelas do seu projeto, se necessário.
const firebaseConfig = {
  apiKey: "AIzaSyCNU5ZEl60OcW5eZyL_ZoD0tFKpweQvhwU",
  authDomain: "crmdoceria-9959e.firebaseapp.com",
  projectId: "crmdoceria-9959e",
  storageBucket: "crmdoceria-9959e.firebasestorage.app",
  messagingSenderId: "389481198252",
  appId: "1:389481198252:web:429bff3cc5d4f353bea509",
  measurementId: "G-XJ7LPG0229"
};


// --- SEÇÃO 3: INICIALIZAÇÃO DO FIREBASE E SERVIÇOS ---
<<<<<<< HEAD
const app = initializeApp(firebaseConfig);
=======
// Usa uma instância nomeada para não interferir na sessão do CRM (app padrão)
const appName = "cardapioPublic";
const app = getApps().find((app) => app.name === appName)
  || initializeApp(firebaseConfig, appName);
>>>>>>> a7c9ca3f (Atualizações multilojas - correções locais)

// Firestore
const db = getFirestore(app);

// Auth
const auth = getAuth(app);


// --- SEÇÃO 4: AUTENTICAÇÃO ANÔNIMA PERSISTENTE ---
// ✅ Garante que a sessão anônima seja criada apenas uma vez por navegador/dispositivo
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Se não existe usuário autenticado, faz login anônimo uma única vez
        signInAnonymously(auth).catch((error) => {
          console.error("Erro ao autenticar anonimamente:", error);
        });
      } else {
        console.log("Sessão anônima ativa:", user.uid);
      }
    });
  })
  .catch((error) => {
    console.error("Erro ao definir persistência de autenticação:", error);
  });


// --- SEÇÃO 5: EXPORTAÇÕES ---
// Disponibiliza para uso no restante da aplicação (ex: cardapio.html)
export { 
  app, // Adicionado para ser usado no script principal
  db, 
  auth, 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp,
  setDoc,
  arrayUnion
};
