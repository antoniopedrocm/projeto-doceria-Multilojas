// Firebase configuration and initialization for the CRM side of the project.
// This file centralises the Firebase SDK setup so other modules can import
// the configured services without duplicating boilerplate.

import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  getFirestore,
  onSnapshot as firestoreOnSnapshot,
  getDoc as firestoreGetDoc,
  deleteDoc as firestoreDeleteDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import {
  getMessaging,
  getToken,
  isSupported as messagingIsSupported,
} from 'firebase/messaging';

// --- Firebase project configuration ---
// Prefer environment variables so production deployments can use a
// dedicated API key and auth domain. Hard-coded fallbacks keep local
// development working out of the box.
const envVar = (key) => process.env[key] || import.meta.env?.[key] || '';

const GOOGLE_API_KEY = 'AIzaSyAIdbF2EgdbZSPqBaQhi1pnNb4t5xauwEc';

const firebaseConfig = {
  apiKey: envVar('REACT_APP_FIREBASE_API_KEY') || GOOGLE_API_KEY,
  authDomain: envVar('REACT_APP_FIREBASE_AUTH_DOMAIN') ||
    'ana-guimaraes.firebaseapp.com',
  projectId: envVar('REACT_APP_FIREBASE_PROJECT_ID') || 'ana-guimaraes',
  // Use the default Firebase bucket (*.appspot.com) in SDK config.
  // The firebasestorage.app domain is only for public/download URLs and
  // breaks Firebase Storage SDK operations when used as storageBucket.
  storageBucket:
    envVar('REACT_APP_FIREBASE_STORAGE_BUCKET') || 'ana-guimaraes.appspot.com',
  messagingSenderId:
    envVar('REACT_APP_FIREBASE_MESSAGING_SENDER_ID') || '847824537421',
  appId:
    envVar('REACT_APP_FIREBASE_APP_ID') ||
    '1:847824537421:web:75861057fd6f998ee49904',
  measurementId: envVar('REACT_APP_FIREBASE_MEASUREMENT_ID') || 'G-F8BVTNLEW7',
};

const runtimeEnv =
  (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) ||
  import.meta.env?.MODE ||
  '';
const isDev = runtimeEnv !== 'production';

const missingEnvKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvKeys.length && isDev) {
  console.warn(
    '[firebaseConfig] Variáveis de ambiente ausentes, usando valores de fallback:',
    missingEnvKeys.join(', ')
  );
}

// Single source for the VAPID key so all modules read the same value and
// we can fail gracefully when it is absent.
export const VAPID_KEY =
  process.env.REACT_APP_FIREBASE_VAPID_KEY ||
  process.env.REACT_APP_VAPID_KEY ||
  import.meta.env?.VITE_VAPID_KEY ||
  '';

// Initialise the Firebase app.  Use getApps() to avoid creating
// duplicate instances if this module is imported multiple times.
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Optionally enable Google Analytics (only works in browsers).  When
// running in Node or during SSR the analytics import will be unused.
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// --- Exported Firebase services ---
// Firestore for data storage, Auth for authentication, Storage for
// file uploads.
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Expose the underlying app and analytics for advanced use cases.
export { app, analytics };

// --- FCM / Notifications ---
// messagingPromise lazily initialises the Messaging service only if
// the browser supports it and the user grants permission for
// notifications.  Code that requires messaging should await this
// promise.


const FIRESTORE_LISTEN_CHANNEL_PATTERN = /firestore\.googleapis\.com\/.+\/listen\/channel/i;

const normalizeFirebaseError = (error) => {
  const code = typeof error?.code === 'string' ? error.code : '';
  const message = typeof error?.message === 'string' ? error.message : '';
  const lowerCode = code.toLowerCase();
  const lowerMessage = message.toLowerCase();

  const codeWithoutNamespace = lowerCode.startsWith('firestore/')
    ? lowerCode.replace('firestore/', '')
    : lowerCode;

  let friendlyMessage = '';
  if (codeWithoutNamespace === 'permission-denied') {
    friendlyMessage = 'Você não tem permissão para acessar estes dados.';
  } else if (codeWithoutNamespace === 'unauthenticated') {
    friendlyMessage = 'Sua sessão expirou. Faça login novamente para continuar.';
  } else if (codeWithoutNamespace === 'failed-precondition') {
    friendlyMessage = 'A operação não pode ser concluída agora. Atualize a página e tente novamente.';
  }

  const isListenChannelRequest = FIRESTORE_LISTEN_CHANNEL_PATTERN.test(lowerMessage);
  const hasFirebaseErrorCode = Boolean(codeWithoutNamespace);
  const looksLikeCorsOrNetwork = lowerMessage.includes('cors')
    || lowerMessage.includes('typeerror')
    || lowerMessage.includes('failed to fetch')
    || lowerMessage.includes('networkerror');

  const interpretedAsCors = isListenChannelRequest && !hasFirebaseErrorCode && looksLikeCorsOrNetwork;

  console.error('[Firebase][Firestore] Erro capturado:', {
    operation: null,
    code: code || null,
    message: message || null,
    interpretedAsCors
  });

  return {
    code,
    codeWithoutNamespace,
    message,
    friendlyMessage,
    interpretedAsCors
  };
};

const mapFirestoreErrorForUi = (operation, error) => {
  const normalized = normalizeFirebaseError(error);
  console.error('[Firebase][Firestore] Falha na operação:', {
    operation,
    code: normalized.code || null,
    message: normalized.message || null,
    interpretedAsCors: normalized.interpretedAsCors
  });

  const fallbackMessage = normalized.interpretedAsCors
    ? 'Não foi possível conectar ao Firestore agora. Verifique sua conexão e tente novamente.'
    : (normalized.message || 'Ocorreu um erro inesperado ao acessar o Firestore.');

  return {
    ...normalized,
    uiMessage: normalized.friendlyMessage || fallbackMessage
  };
};

const buildUiError = (operation, error) => {
  const mapped = mapFirestoreErrorForUi(operation, error);
  const uiError = new Error(mapped.uiMessage);
  uiError.name = 'FirestoreUiError';
  uiError.code = mapped.code;
  uiError.firebaseCode = mapped.codeWithoutNamespace || null;
  uiError.originalMessage = mapped.message;
  uiError.interpretedAsCors = mapped.interpretedAsCors;
  uiError.cause = error;
  return uiError;
};

export const getDoc = async (...args) => {
  try {
    return await firestoreGetDoc(...args);
  } catch (error) {
    throw buildUiError('getDoc', error);
  }
};

export const deleteDoc = async (...args) => {
  try {
    return await firestoreDeleteDoc(...args);
  } catch (error) {
    throw buildUiError('deleteDoc', error);
  }
};

export const onSnapshot = (...args) => {
  const hasObserverObject = typeof args[1] === 'object' && args[1] !== null;

  if (hasObserverObject) {
    const observer = args[1];
    const originalError = observer.error;
    return firestoreOnSnapshot(args[0], {
      ...observer,
      error: (error) => {
        const uiError = buildUiError('onSnapshot', error);
        if (typeof originalError === 'function') {
          originalError(uiError);
        } else {
          console.error('[Firebase][Firestore] onSnapshot sem callback de erro:', uiError);
        }
      }
    });
  }

  const errorCallbackIndex = typeof args[2] === 'function' ? 2 : -1;
  if (errorCallbackIndex >= 0) {
    const originalError = args[errorCallbackIndex];
    const nextArgs = [...args];
    nextArgs[errorCallbackIndex] = (error) => {
      const uiError = buildUiError('onSnapshot', error);
      originalError(uiError);
    };
    return firestoreOnSnapshot(...nextArgs);
  }

  return firestoreOnSnapshot(...args);
};

export const messagingPromise = (async () => {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await messagingIsSupported();
    if (!supported) return null;
    const messaging = getMessaging(app);
    if (!VAPID_KEY) {
      return messaging;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('🔔 Notification permission not granted');
      return messaging;
    }
    await getToken(messaging, { vapidKey: VAPID_KEY });
    return messaging;
  } catch (err) {
    console.error('Failed to initialise Firebase Messaging:', err);
    return null;
  }
})();
