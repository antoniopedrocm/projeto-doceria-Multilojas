import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import {
  connectStorageEmulator,
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

const projectId = 'demo-doceria';

function createApp(name) {
  return initializeApp(
    {
      apiKey: 'demo-key',
      authDomain: 'demo-doceria.firebaseapp.com',
      projectId,
      storageBucket: `${projectId}.appspot.com`,
    },
    name,
  );
}

async function expectReject(label, fn) {
  try {
    await fn();
    throw new Error(`Esperava falha em: ${label}`);
  } catch (error) {
    if (String(error?.message || '').includes('Esperava falha em')) {
      throw error;
    }
    console.log(`✅ ${label} bloqueado como esperado (${error?.code || 'erro'})`);
  }
}

async function expectResolve(label, fn) {
  await fn();
  console.log(`✅ ${label} permitido como esperado`);
}

async function main() {
  const authedApp = createApp('authed');
  const authedAuth = getAuth(authedApp);
  const authedStorage = getStorage(authedApp);

  connectAuthEmulator(authedAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectStorageEmulator(authedStorage, '127.0.0.1', 9199);

  const unauthApp = createApp('unauth');
  const unauthStorage = getStorage(unauthApp);
  connectStorageEmulator(unauthStorage, '127.0.0.1', 9199);

  await signInAnonymously(authedAuth);

  const data = new Blob(['img-test'], { type: 'text/plain' });

  await expectResolve('Upload autenticado em módulo de produtos legado', async () => {
    await uploadBytes(ref(authedStorage, 'products/test-auth.txt'), data);
  });

  await expectResolve('Upload autenticado em stores/{storeId}/products', async () => {
    await uploadBytes(ref(authedStorage, 'stores/storeA/products/test-auth.txt'), data);
  });

  await expectResolve('Upload autenticado em stores/{storeId}/menu', async () => {
    await uploadBytes(ref(authedStorage, 'stores/storeA/menu/test-auth.txt'), data);
  });

  await expectReject('Upload anônimo indevido em módulo de produtos', async () => {
    await uploadBytes(ref(unauthStorage, 'products/test-unauth.txt'), data);
  });

  await expectReject('Upload anônimo indevido em stores/{storeId}/products', async () => {
    await uploadBytes(ref(unauthStorage, 'stores/storeA/products/test-unauth.txt'), data);
  });

  await expectResolve('Download público de imagem de produtos', async () => {
    await getDownloadURL(ref(unauthStorage, 'products/test-auth.txt'));
  });

  await expectResolve('Download público de imagem de cardápio por loja', async () => {
    await getDownloadURL(ref(unauthStorage, 'stores/storeA/menu/test-auth.txt'));
  });

  await expectReject('Download anônimo de path genérico bloqueado', async () => {
    await getDownloadURL(ref(unauthStorage, 'admin/secret.txt'));
  });
}

main().catch((error) => {
  console.error('❌ Falha nos testes de Storage Rules');
  console.error(error);
  process.exit(1);
});
