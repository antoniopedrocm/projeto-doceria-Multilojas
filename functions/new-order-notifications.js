const crypto = require('crypto');

const NON_ORDER_ROLES = new Set(['cliente', 'client', 'contador', 'accountant']);
const OWNER_ROLES = new Set([
  'dono', 'owner', 'admin', 'adm', 'administrador', 'administradora',
  'administrador_master', 'administradora_master', 'admin_master', 'master',
  'superadmin',
]);

const normalizeRole = (value) => String(value || '').trim().toLowerCase();

const addStoreValue = (value, result) => {
  if (typeof value === 'string') {
    const storeId = value.trim();
    if (storeId) result.add(storeId);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => addStoreValue(item, result));
    return;
  }
  if (value && typeof value === 'object') {
    addStoreValue(value.id || value.lojaId || value.storeId, result);
  }
};

const extractProfileStoreIds = (profile = {}) => {
  const result = new Set();
  addStoreValue(profile.lojaId, result);
  addStoreValue(profile.lojaIds, result);
  addStoreValue(profile.lojas, result);
  return [...result];
};

const profileCanReceiveOrder = (profile, storeId) => {
  if (!profile || profile.ativo === false || profile.authDisabled === true) return false;
  if (String(profile.status || '').trim().toLowerCase() === 'inativo') return false;

  const role = normalizeRole(profile.role);
  if (!role || NON_ORDER_ROLES.has(role)) return false;

  const storeIds = extractProfileStoreIds(profile);
  if (OWNER_ROLES.has(role) && storeIds.length === 0) return true;
  return storeIds.includes(String(storeId || '').trim());
};

const formatMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return amount.toFixed(2).replace('.', ',');
};

const buildNewOrderData = ({orderId, storeId, order = {}}) => {
  const customerName = String(
      order.clienteNome || order.nomeCliente || order.nome || order.cliente?.nome || '',
  ).trim();
  const category = String(order.categoria || order.tipoEntrega || order.origem || '').trim();
  const total = formatMoney(order.total);
  const orderCode = String(
      order.numeroPedido || order.codigo || order.numero || String(orderId).slice(0, 8),
  ).trim();
  const details = [total ? `R$ ${total}` : '', category, customerName].filter(Boolean);

  return {
    type: 'new_order',
    orderId: String(orderId),
    storeId: String(storeId),
    lojaId: String(storeId),
    customerName,
    total,
    category,
    title: '🔔 NOVO PEDIDO',
    body: `Pedido #${orderCode}${details.length ? ` • ${details.join(' • ')}` : ''}`,
    source: 'new-order',
    playAlarm: 'true',
    url: `/?page=pedidos&orderId=${encodeURIComponent(orderId)}&lojaId=${encodeURIComponent(storeId)}`,
  };
};

const isNewPendingOrder = (order = {}) => (
  String(order.status || 'Pendente').trim().toLowerCase() === 'pendente'
);

const buildNotificationEventKey = (storeId, orderId) => crypto
    .createHash('sha256')
    .update(`${String(storeId || '').trim()}:${String(orderId || '').trim()}`)
    .digest('hex');

const canClaimNotificationEvent = (eventData) => (
  !eventData || eventData.status === 'failed'
);

const isInvalidMessagingTokenError = (errorCode) => [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
].includes(String(errorCode || ''));

module.exports = {
  buildNewOrderData,
  buildNotificationEventKey,
  canClaimNotificationEvent,
  extractProfileStoreIds,
  isInvalidMessagingTokenError,
  isNewPendingOrder,
  profileCanReceiveOrder,
};
