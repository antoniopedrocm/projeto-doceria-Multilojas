// --- SEÇÃO 1: IMPORTAÇÕES DO FIREBASE SDK ---
// Este bloco importa as funções e módulos necessários diretamente dos servidores do Firebase.
// Usar a URL completa é a forma padrão de usar o Firebase em arquivos HTML/JS puros.

// 'initializeApp' é a função principal para conectar-se ao seu projeto Firebase.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

// Importa todas as funções relacionadas ao Firestore, o banco de dados NoSQL do Firebase.
// Isso inclui funções para buscar coleções ('collection'), obter documentos ('getDocs', 'getDoc'),
// adicionar ('addDoc'), atualizar ('updateDoc'), e consultar dados ('query', 'where').
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

// Importa a função para obter o serviço de Autenticação.
// A função 'signInAnonymously' foi removida intencionalmente para resolver o problema.
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


// --- SEÇÃO 2: CONFIGURAÇÃO DO PROJETO FIREBASE ---
// Este objeto 'firebaseConfig' contém as chaves e identificadores únicos do SEU projeto Firebase.
// É como o "endereço" que diz ao seu site a qual projeto Firebase ele deve se conectar.
// Essas chaves são seguras para serem expostas no lado do cliente, pois a segurança é controlada pelas Regras de Segurança (firestore.rules).
const firebaseConfig = {
  apiKey: "AIzaSyCNU5ZEl60OcW5eZyL_ZoD0tFKpweQvhwU",
  authDomain: "crmdoceria-9959e.firebaseapp.com",
  projectId: "crmdoceria-9959e",
  storageBucket: "crmdoceria-9959e.firebasestorage.app",
  messagingSenderId: "389481198252",
  appId: "1:389481198252:web:429bff3cc5d4f353bea509",
  measurementId: "G-XJ7LPG0229"
};


// --- SEÇÃO 3: INICIALIZAÇÃO DO FIREBASE E SEUS SERVIÇOS ---

// A função 'initializeApp' é chamada com o objeto de configuração.
// Isso estabelece a conexão inicial com o Firebase e retorna uma instância da aplicação.
const app = initializeApp(firebaseConfig);

// A partir da instância da aplicação ('app'), inicializamos os serviços que vamos usar.
// 'db' será o nosso objeto para interagir com o banco de dados Firestore.
const db = getFirestore(app);
// 'auth' será o nosso objeto para lidar com autenticação, se necessário.
const auth = getAuth(app); // A instância é mantida, mas não é usada para login nesta página.


// --- SEÇÃO 4: EXPORTAÇÃO DOS MÓDULOS ---
// A palavra-chave 'export' torna as variáveis e funções disponíveis para outros arquivos
// que importarem este script (como é o caso do seu 'cardapio.html').
// Isso permite que a página do cardápio acesse o banco de dados ('db') e as funções do Firestore.
export { 
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
