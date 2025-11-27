// Firebase configuration and initialization for the CRM side of the project.
// This file centralises the Firebase SDK setup so other modules can import
// the configured services without duplicating boilerplate.

import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import {
  getMessaging,
  getToken,
  isSupported as messagingIsSupported,
} from 'firebase/messaging';

// --- Firebase project configuration ---
// The values below were provided by the user and correspond to the
// development instance hosted at ana‑guimaraes.firebaseapp.com.  When
// switching to a custom domain in the future, these values should
// remain the same as long as the underlying Firebase project doesn't change.
const firebaseConfig = {
  apiKey: 'AIzaSyAIdbF2EgdbZSPqBaQhi1pnNb4t5xauwEc',
  authDomain: 'ana-guimaraes.firebaseapp.com',
  projectId: 'ana-guimaraes',
  // Use the default Firebase storage host (appspot.com). The previous value
  // pointed to firebasestorage.app, which is only for direct download links
  // and breaks SDK requests.
  storageBucket: 'ana-guimaraes.appspot.com',
  messagingSenderId: '847824537421',
  appId: '1:847824537421:web:75861057fd6f998ee49904',
  measurementId: 'G-F8BVTNLEW7',
};

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
export const messagingPromise = (async () => {
  if (typeof window === 'undefined') return null;
  try {
    const supported = await messagingIsSupported();
    if (!supported) return null;
    const messaging = getMessaging(app);
    // Request permission to send notifications.  This must be
    // triggered from a user gesture in most browsers; failure to
    // request here will cause the promise to reject.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('🔔 Notification permission not granted');
      return messaging;
    }
    if (!VAPID_KEY) {
      console.warn('VAPID key não configurada; notificações push permanecerão desativadas.');
      return messaging;
    }

    await getToken(messaging, { vapidKey: VAPID_KEY });
    return messaging;
  } catch (err) {
    console.error('Failed to initialise Firebase Messaging:', err);
    return null;
  }
})();