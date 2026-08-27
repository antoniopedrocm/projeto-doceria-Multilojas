const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildNewOrderData,
  buildNotificationEventKey,
  canClaimNotificationEvent,
  isInvalidMessagingTokenError,
  isNewPendingOrder,
  profileCanReceiveOrder,
} = require('./new-order-notifications');

test('seleciona somente perfis ativos e autorizados para a loja', () => {
  assert.equal(profileCanReceiveOrder({role: 'gerente', lojaIds: ['matriz']}, 'matriz'), true);
  assert.equal(profileCanReceiveOrder({role: 'gerente', lojaIds: ['garavelo']}, 'matriz'), false);
  assert.equal(profileCanReceiveOrder({role: 'atendente', lojaId: 'matriz'}, 'matriz'), true);
  assert.equal(profileCanReceiveOrder({role: 'cliente', lojaIds: ['matriz']}, 'matriz'), false);
  assert.equal(profileCanReceiveOrder({role: 'contador', lojaIds: ['matriz']}, 'matriz'), false);
  assert.equal(profileCanReceiveOrder({role: 'dono', lojaIds: []}, 'matriz'), true);
  assert.equal(profileCanReceiveOrder({role: 'dono', ativo: false}, 'matriz'), false);
  assert.equal(profileCanReceiveOrder({role: 'dono', authDisabled: true}, 'matriz'), false);
  assert.equal(profileCanReceiveOrder({role: 'gerente', status: 'inativo', lojaIds: ['matriz']}, 'matriz'), false);
});

test('gera payload Android/web com navegacao para o pedido correto', () => {
  const payload = buildNewOrderData({
    orderId: 'ABC123',
    storeId: 'matriz',
    order: {clienteNome: 'Yasmin', total: 51, categoria: 'Delivery'},
  });

  assert.equal(payload.type, 'new_order');
  assert.equal(payload.orderId, 'ABC123');
  assert.equal(payload.storeId, 'matriz');
  assert.equal(payload.lojaId, 'matriz');
  assert.equal(payload.total, '51,00');
  assert.equal(payload.playAlarm, 'true');
  assert.match(payload.body, /Yasmin/);
  assert.equal(payload.url, '/?page=pedidos&orderId=ABC123&lojaId=matriz');
});

test('somente criacao pendente representa novo pedido notificavel', () => {
  assert.equal(isNewPendingOrder({}), true);
  assert.equal(isNewPendingOrder({status: 'Pendente'}), true);
  assert.equal(isNewPendingOrder({status: 'Em Produção'}), false);
  assert.equal(isNewPendingOrder({status: 'Cancelado'}), false);
});

test('ledger usa chave deterministica e impede reprocessamento', () => {
  const first = buildNotificationEventKey('matriz', 'pedido-1');
  const repeated = buildNotificationEventKey('matriz', 'pedido-1');
  const other = buildNotificationEventKey('garavelo', 'pedido-1');

  assert.equal(first, repeated);
  assert.notEqual(first, other);
  assert.equal(canClaimNotificationEvent(null), true);
  assert.equal(canClaimNotificationEvent({status: 'failed'}), true);
  assert.equal(canClaimNotificationEvent({status: 'processing'}), false);
  assert.equal(canClaimNotificationEvent({status: 'sent'}), false);
});

test('identifica somente erros de token que exigem limpeza', () => {
  assert.equal(isInvalidMessagingTokenError('messaging/registration-token-not-registered'), true);
  assert.equal(isInvalidMessagingTokenError('messaging/invalid-registration-token'), true);
  assert.equal(isInvalidMessagingTokenError('messaging/internal-error'), false);
});
