import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Importa o service worker
import * as serviceWorkerRegistration from './serviceWorker';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ✅ CORREÇÃO:
// Altera o registro para 'unregister()' para corrigir o erro de
// MIME type no console do navegador.
serviceWorkerRegistration.unregister();