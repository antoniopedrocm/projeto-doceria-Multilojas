const SW_FILENAME = 'firebase-messaging-sw.js';
const UPDATE_FOUND_EVENT = 'service-worker-update-found';

function shouldRegisterServiceWorker() {
  if (process.env.REACT_APP_DISABLE_SERVICE_WORKER === 'true') {
    return false;
  }

  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  return process.env.REACT_APP_ENABLE_SERVICE_WORKER === 'true';
}

function reloadWhenActivated() {
  let hasReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloaded) {
      return;
    }

    hasReloaded = true;
    window.location.reload();
  });
}

function dispatchUpdateEvent(registration) {
  window.dispatchEvent(
    new CustomEvent(UPDATE_FOUND_EVENT, {
      detail: { registration }
    })
  );
}

function trackInstallingWorker(registration, onUpdate) {
  const installingWorker = registration.installing;
  if (!installingWorker) {
    return;
  }

  installingWorker.addEventListener('statechange', () => {
    if (installingWorker.state !== 'installed' || !navigator.serviceWorker.controller) {
      return;
    }

    if (typeof onUpdate === 'function') {
      onUpdate(registration);
      return;
    }

    dispatchUpdateEvent(registration);
  });
}

export function register(config = {}) {
  if (!shouldRegisterServiceWorker()) {
    console.info('[serviceWorker] Registro desabilitado pelo ambiente.');
    return;
  }

  if ('serviceWorker' in navigator) {
    // Remove uma barra no final do PUBLIC_URL (caso exista).
    const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
    const swUrl = publicUrl ? `${publicUrl}/${SW_FILENAME}` : `/${SW_FILENAME}`;

    const registerServiceWorker = () => {
      reloadWhenActivated();

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('✅ Service Worker registrado com sucesso:', registration);

          if (registration.waiting) {
            if (typeof config.onUpdate === 'function') {
              config.onUpdate(registration);
            } else {
              dispatchUpdateEvent(registration);
            }
          }

          registration.addEventListener('updatefound', () => {
            trackInstallingWorker(registration, config.onUpdate);
          });

          trackInstallingWorker(registration, config.onUpdate);
        })
        .catch((error) => {
          console.error('❌ Falha ao registrar o Service Worker:', error);
        });
    };

    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
    }
  }
}

/**
 * Cancela o registro do service worker.
 *
 * Use esta função para desativar o suporte offline e notificações.
 */
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}

export function requestServiceWorkerActivation(registration) {
  if (!registration?.waiting) {
    return false;
  }

  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

export { UPDATE_FOUND_EVENT };
