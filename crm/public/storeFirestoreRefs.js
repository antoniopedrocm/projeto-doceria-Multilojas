export const STORE_ALL_KEY = '__all__';
export const CONFIG_DOC_ID = 'config';
const CONFIG_COLLECTIONS = new Set(['cupons', 'logs']);

export const normalizeStoreId = (storeId) => {
  if (typeof storeId !== 'string') return '';
  return storeId.trim();
};

export const assertValidStoreId = (storeId, label = 'storeId') => {
  const normalized = normalizeStoreId(storeId);
  if (!normalized) {
    throw new Error(`${label} é obrigatório para acessar dados por loja.`);
  }
  if (normalized === STORE_ALL_KEY) {
    throw new Error(`${label}=${STORE_ALL_KEY} não pode ser usado no cardápio por loja.`);
  }
  return normalized;
};

export const buildStorePath = (storeId, ...segments) => {
  const normalizedStoreId = assertValidStoreId(storeId);
  if (!segments.length) return ['lojas', normalizedStoreId];

  const [first, ...rest] = segments;
  if (CONFIG_COLLECTIONS.has(first)) {
    return ['lojas', normalizedStoreId, 'configuracoes', CONFIG_DOC_ID, first, ...rest];
  }

  if (first === 'clientes') {
    return ['clientes', ...rest];
  }

  return ['lojas', normalizedStoreId, first, ...rest];
};

export const buildStoreConfigDocPath = (storeId, ...segments) => [
  'lojas',
  assertValidStoreId(storeId),
  'configuracoes',
  CONFIG_DOC_ID,
  ...segments,
];

export const buildLegacyConfigPath = (storeId, ...segments) => [
  'lojas',
  assertValidStoreId(storeId),
  'configuracoes',
  ...segments,
];

export const buildLegacyStorePath = (storeId, ...segments) => [
  'lojas',
  assertValidStoreId(storeId),
  ...segments,
];
