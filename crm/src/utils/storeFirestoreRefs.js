import { collection, doc } from 'firebase/firestore';

export const STORE_ALL_KEY = '__all__';
export const CONFIG_DOC_ID = 'config';
const DEFAULT_CONFIG_COLLECTIONS = new Set(['cupons', 'logs']);

export const normalizeStoreId = (storeId) => {
  if (typeof storeId !== 'string') return '';
  return storeId.trim();
};

export const isSpecialStoreId = (storeId) => {
  const normalized = normalizeStoreId(storeId);
  return !normalized || normalized === STORE_ALL_KEY;
};

export const assertValidStoreId = (storeId, label = 'storeId') => {
  const normalized = normalizeStoreId(storeId);
  if (!normalized) {
    throw new Error(`${label} é obrigatório para acessar dados por loja.`);
  }
  if (normalized === STORE_ALL_KEY) {
    throw new Error(`${label}=${STORE_ALL_KEY} não pode ser usado para operações por loja.`);
  }
  return normalized;
};

export const buildStoreCollectionPath = (
  storeId,
  collectionName,
  { useLegacyPath = false, configCollections = DEFAULT_CONFIG_COLLECTIONS } = {}
) => {
  const normalizedStoreId = assertValidStoreId(storeId);
  const shouldUseConfigPath = configCollections.has(collectionName) && !useLegacyPath;

  return shouldUseConfigPath
    ? ['lojas', normalizedStoreId, 'configuracoes', CONFIG_DOC_ID, collectionName]
    : ['lojas', normalizedStoreId, collectionName];
};

export const getStoreCollectionRef = (db, storeId, collectionName, options = {}) => (
  collection(db, ...buildStoreCollectionPath(storeId, collectionName, options))
);

export const getStoreDocRef = (db, storeId, collectionName, docId, options = {}) => (
  doc(db, ...buildStoreCollectionPath(storeId, collectionName, options), docId)
);

export const getStoreConfigDocRef = (db, storeId) => doc(db, 'lojas', assertValidStoreId(storeId), 'configuracoes', CONFIG_DOC_ID);

export const getStoreRootDocRef = (db, storeId) => doc(db, 'lojas', assertValidStoreId(storeId));

export const getStoreScopedCollectionRef = (db, storeId, ...segments) => (
  collection(db, 'lojas', assertValidStoreId(storeId), ...segments)
);

export const getStoreScopedDocRef = (db, storeId, ...segments) => (
  doc(db, 'lojas', assertValidStoreId(storeId), ...segments)
);
