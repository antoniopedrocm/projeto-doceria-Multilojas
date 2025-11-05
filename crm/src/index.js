import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Importa o service worker
import * as serviceWorkerRegistration from './serviceWorker';

<<<<<<< HEAD
=======
if (process.env.NODE_ENV === 'production') {
  const { hostname, protocol, pathname, search, hash } = window.location;

  if (hostname === 'anaguimaraesdoceria.com.br') {
    const redirectURL = `${protocol}//www.${hostname}${pathname}${search}${hash}`;
    window.location.replace(redirectURL);
  }
}

>>>>>>> a7c9ca3f (Atualizações multilojas - correções locais)
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

<<<<<<< HEAD
// ✅ CORREÇÃO:
// Altera o registro para 'unregister()' para corrigir o erro de
// MIME type no console do navegador.
serviceWorkerRegistration.unregister();
=======
// ✅ Service worker habilitado para permitir notificações push, cache offline e
// reprodução de áudio em segundo plano quando a aplicação estiver instalada
// como PWA ou empacotada em apps nativos.
serviceWorkerRegistration.register();
>>>>>>> a7c9ca3f (Atualizações multilojas - correções locais)
