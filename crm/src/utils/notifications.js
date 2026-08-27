import { getToken, onMessage } from "firebase/messaging";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db, messagingPromise, VAPID_KEY } from "../firebaseConfig.js";
import {
  buildNotificationTokenRecord,
  normalizePushToken,
} from './notificationCore.js';
export {parseNotificationNavigation} from './notificationCore.js';
const isBrowser = typeof window !== "undefined";
const runtimeEnv =
  (typeof process !== "undefined" && process.env && process.env.NODE_ENV) ||
  import.meta.env?.MODE ||
  "";
const isDev = runtimeEnv !== "production";

async function persistPushToken({uid, token, platform}) {
  const normalizedToken = normalizePushToken(token);
  if (!uid || !normalizedToken) return null;

  await setDoc(
    doc(db, "notificationTokens", normalizedToken),
    buildNotificationTokenRecord({
      uid,
      platform,
      devicePlatform: navigator.platform || "unknown",
      userAgent: navigator.userAgent,
      updatedAt: serverTimestamp(),
    }),
    {merge: true}
  );
  return normalizedToken;
}

async function ensureServiceWorkerRegistration() {
  if (!isBrowser || !('serviceWorker' in navigator)) {
    throw new Error('Service workers não são suportados neste ambiente.');
  }

  try {
    const readyRegistration = await navigator.serviceWorker.ready;
    const readyScriptUrl = readyRegistration.active?.scriptURL;
    if (readyScriptUrl && readyScriptUrl.includes('firebase-messaging-sw.js')) {
      return readyRegistration;
    }
  } catch (error) {
    console.warn('[notifications] Não foi possível obter serviceWorker.ready:', error);
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  const existing = registrations.find((registration) => {
    const scriptURL =
      registration.active?.scriptURL ||
      registration.installing?.scriptURL ||
      registration.waiting?.scriptURL;
    return scriptURL?.includes("firebase-messaging-sw.js");
  });

  if (existing) {
    return existing;
  }

  return navigator.serviceWorker.register("/firebase-messaging-sw.js");
}

export async function registerDeviceForPush(uid) {
  if (!isBrowser) return null;

  const messaging = await messagingPromise;
  if (!messaging) return null;

  if (!("Notification" in window)) {
    console.warn("API de notificações não suportada neste navegador.");
    return null;
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    console.warn("Permissão para notificações não concedida.");
    return null;
  }

  if (!VAPID_KEY) {
    if (isDev) {
      console.warn(
        "A variável de ambiente da chave VAPID não está configurada; notificações push permanecerão desativadas."
      );
    }
    return null;
  }

  try {
    const registration = await ensureServiceWorkerRegistration();
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn("Não foi possível obter o token de push.");
      return null;
    }

    return persistPushToken({uid, token, platform: "web"});
  } catch (error) {
    const errorCode = error?.code || "";
    const errorMessage = String(error?.message || "");
    const isForbiddenTokenError =
      errorCode.includes("messaging/token-subscribe-failed") ||
      errorMessage.includes("registrations.googleapis.com") ||
      errorMessage.includes("403");

    if (isForbiddenTokenError) {
      console.warn(
        "Falha ao obter token de push (FCM 403). As demais funcionalidades continuarão operando normalmente."
      );
      return null;
    }

    console.error("Falha ao registrar notificações push:", error);
    throw error;
  }
}

export async function registerAndroidDeviceForPush(uid, token) {
  if (!isBrowser) return null;
  return persistPushToken({uid, token, platform: "android"});
}

export function subscribeToAndroidPushTokens(callback) {
  if (!isBrowser || typeof callback !== "function") return () => {};

  let lastToken = "";
  const previousCallback = window.__anaAndroidRegisterPushToken;
  const emitToken = (value) => {
    const token = normalizePushToken(value);
    if (!token || token === lastToken) return;
    lastToken = token;
    window.__anaAndroidPushTokenSync = token;
    Promise.resolve(callback(token)).catch((error) => {
      console.error("[Android] Falha ao sincronizar token FCM:", error);
    });
  };
  const readNativeToken = () => {
    emitToken(window.__anaAndroidPushTokenSync);
    try {
      emitToken(window.AnaAndroidBridge?.getPushToken?.());
    } catch (error) {
      console.warn("[Android] Bridge FCM ainda não está disponível.", error);
    }
  };
  const handleTokenEvent = (event) => {
    emitToken(event?.detail?.token || event?.detail || event?.data?.token);
  };

  window.__anaAndroidRegisterPushToken = emitToken;
  window.addEventListener("ana-android-push-token", handleTokenEvent);
  readNativeToken();
  const pollingId = window.setInterval(readNativeToken, 2000);

  try {
    window.AnaAndroidBridge?.requestPushToken?.();
  } catch (error) {
    console.warn("[Android] Não foi possível solicitar o token ao bridge.", error);
  }

  return () => {
    window.clearInterval(pollingId);
    window.removeEventListener("ana-android-push-token", handleTokenEvent);
    if (window.__anaAndroidRegisterPushToken === emitToken) {
      if (typeof previousCallback === "function") {
        window.__anaAndroidRegisterPushToken = previousCallback;
      } else {
        delete window.__anaAndroidRegisterPushToken;
      }
    }
  };
}

export async function listenForForegroundMessages(callback) {
  if (!isBrowser) return () => {};

  const messaging = await messagingPromise;
  if (!messaging) return () => {};

  return onMessage(messaging, callback);
}

export function subscribeToServiceWorkerMessages(callback) {
  if (!isBrowser || !("serviceWorker" in navigator)) {
    return () => {};
  }

  const handler = (event) => {
    callback(event);
  };

  navigator.serviceWorker.addEventListener("message", handler);

  return () => {
    navigator.serviceWorker.removeEventListener("message", handler);
  };
}
