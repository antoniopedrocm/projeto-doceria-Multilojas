import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorker';

// Em produção, prepara redirecionamento para o domínio personalizado
if (process.env.NODE_ENV === 'production') {
  const { hostname, protocol, pathname, search, hash } = window.location;
  // Quando o app estiver hospedado no Firebase Hosting, o domínio será ana-guimaraes.web.app.
  // Esta verificação permite redirecionar futuramente para a versão www do domínio.
  if (hostname === 'ana-guimaraes.web.app') {
    const redirectURL = `${protocol}//www.${hostname}${pathname}${search}${hash}`;
    window.location.replace(redirectURL);
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const showRefreshPrompt = (registration) => {
  const accepted = window.confirm(
    'Uma nova versão do sistema está disponível. Deseja atualizar agora?'
  );

  if (accepted) {
    const activationRequested =
      serviceWorkerRegistration.requestServiceWorkerActivation(registration);
    if (!activationRequested) {
      window.location.reload();
    }
  }
};

window.addEventListener(serviceWorkerRegistration.UPDATE_FOUND_EVENT, (event) => {
  showRefreshPrompt(event.detail.registration);
});

serviceWorkerRegistration.register({
  onUpdate: showRefreshPrompt
});
