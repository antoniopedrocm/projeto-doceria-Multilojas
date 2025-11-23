// Lightweight shim for the Capacitor core API used in the web build.
// Provides only the minimal surface needed by the application.

const detectPlatform = () => {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'web';
};

export const Capacitor = {
  getPlatform: () => detectPlatform()
};
