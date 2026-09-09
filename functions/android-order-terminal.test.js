const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CUSTOM_TOKEN_HANDOFF_VALIDITY_MS,
  TERMINAL_SESSION_VALIDITY_MS,
  buildAndroidNewOrderData,
  buildAndroidOrderStateChangedData,
  deduplicateTokenDocs,
  getActivePausedUntil,
  getAndroidTerminalTokenId,
  getReplacedTerminalSession,
  hashInstallationSecret,
  isNativeTerminalAuth,
  isStoreOpenNow,
  matchesInstallationSecret,
  matchesNativeSessionBinding,
  normalizeContextRevision,
  resolveContextRevisionAction,
  shouldDeleteLegacyTokenRegistration,
  shouldEnforceStoreOpenState,
  throwIfRetryableDeliveryFailed,
} = require('./android-order-terminal');

test('sessão operacional usa janela móvel de trinta dias', () => {
  assert.equal(TERMINAL_SESSION_VALIDITY_MS, 30 * 24 * 60 * 60 * 1000);
  assert.equal(CUSTOM_TOKEN_HANDOFF_VALIDITY_MS, 55 * 60 * 1000);
});

test('registro inicial expira com o handoff e só o registro nativo ganha trinta dias', () => {
  const source = require('node:fs').readFileSync(
      require('node:path').join(__dirname, 'android-order-terminal.js'),
      'utf8',
  );
  assert.match(
      source,
      /expiresAt: admin\.firestore\.Timestamp\.fromMillis\(handoffExpiresAt\)/,
  );
  assert.match(source, /const renewedExpiresAt = nowMillis \+ TERMINAL_SESSION_VALIDITY_MS/);
});

test('mantém a semântica comercial da web quando a loja não configurou agenda', () => {
  assert.equal(shouldEnforceStoreOpenState({}), false);
  assert.equal(isStoreOpenNow({}), true);
  assert.equal(isStoreOpenNow({schedule: {mon: {enabled: false}}}), true);
  assert.equal(isStoreOpenNow({manualOverride: {mode: 'force_closed'}}), false);
  assert.equal(isStoreOpenNow({manualOverride: {mode: 'force_open'}}), true);
});

test('aplica agenda habilitada na fonte de configuração existente', () => {
  const config = {
    timezone: 'UTC',
    schedule: {mon: {enabled: true, open: '09:00', close: '18:00'}},
  };
  assert.equal(isStoreOpenNow(config, new Date('2026-08-31T12:00:00.000Z')), true);
  assert.equal(isStoreOpenNow(config, new Date('2026-08-31T20:00:00.000Z')), false);
  assert.equal(isStoreOpenNow(config, new Date('2026-09-01T12:00:00.000Z')), false);
});

test('pausa ativa nunca é apagada ou reinterpretada pelo payload', () => {
  assert.equal(getActivePausedUntil({pausedUntil: 20_000}, 10_000), 20_000);
  assert.equal(getActivePausedUntil({pausedUntil: 10_000}, 10_000), 0);
  const payload = buildAndroidNewOrderData({
    eventId: 'event-1',
    orderId: 'pedido-1',
    storeId: 'matriz',
    order: {numeroPedido: '42'},
    targetUid: 'uid-1',
    sessionId: 'session-1',
    revision: 7,
    pendingCount: 2,
    storeOpen: true,
    pausedUntil: 20_000,
    storeName: 'Matriz',
    contextRevision: 11,
  });
  assert.equal(payload.alertAllowed, 'false');
  assert.equal(payload.pausedUntil, '20000');
  assert.equal(payload.pendingCount, '2');
  assert.equal(payload.revision, '7');
  assert.equal(payload.contextRevision, '11');
  Object.values(payload).forEach((value) => assert.equal(typeof value, 'string'));
});

test('novo pedido fechado também informa que alerta sonoro não é permitido', () => {
  const payload = buildAndroidNewOrderData({
    eventId: 'event-2',
    orderId: 'pedido-2',
    storeId: 'matriz',
    targetUid: 'uid-1',
    sessionId: 'session-1',
    storeOpen: false,
  });
  assert.equal(payload.storeOpen, 'false');
  assert.equal(payload.alertAllowed, 'false');
});

test('mudança de estado gera somente dados serializáveis pelo FCM', () => {
  const payload = buildAndroidOrderStateChangedData({
    eventId: 'event-3',
    orderId: 'pedido-3',
    storeId: 'matriz',
    targetUid: 'uid-1',
    sessionId: 'session-1',
    revision: 8,
    isPending: false,
    contextRevision: 12,
  });
  assert.deepEqual(payload, {
    type: 'order_state_changed',
    eventId: 'event-3',
    orderId: 'pedido-3',
    storeId: 'matriz',
    targetUid: 'uid-1',
    sessionId: 'session-1',
    revision: '8',
    isPending: 'false',
    contextRevision: '12',
  });
});

test('prova da instalação usa somente hash e comparação resistente a timing', () => {
  const installationSecret = 'A'.repeat(43);
  const secretHash = hashInstallationSecret(installationSecret);
  assert.match(secretHash, /^[a-f0-9]{64}$/);
  assert.equal(secretHash.includes(installationSecret), false);
  assert.equal(matchesInstallationSecret(secretHash, installationSecret), true);
  assert.equal(matchesInstallationSecret(secretHash, 'B'.repeat(43)), false);
  assert.equal(matchesInstallationSecret('', installationSecret), false);
  assert.equal(matchesInstallationSecret(secretHash, 'curto'), false);
});

test('contextRevision impede regressão e conflito, mas permite retry idempotente', () => {
  assert.equal(normalizeContextRevision(9), 9);
  assert.equal(normalizeContextRevision('10'), 10);
  assert.equal(normalizeContextRevision(0), 0);
  assert.equal(normalizeContextRevision(1.5), 0);
  assert.equal(resolveContextRevisionAction(8, 7, true), 'stale');
  assert.equal(resolveContextRevisionAction(8, 8, true), 'idempotent');
  assert.equal(resolveContextRevisionAction(8, 8, false), 'conflict');
  assert.equal(resolveContextRevisionAction(8, 9, false), 'advance');
});

test('sessão vinculada exige id, secret e revisão exatos', () => {
  const installationSecret = 'C'.repeat(43);
  const session = {
    installationId: 'installation-1',
    installationSecretHash: hashInstallationSecret(installationSecret),
    contextRevision: 14,
    activeStoreId: 'matriz',
  };
  const binding = {
    installationId: 'installation-1',
    installationSecret,
    contextRevision: 14,
  };
  assert.equal(matchesNativeSessionBinding(session, binding), true);
  assert.equal(matchesNativeSessionBinding(session, {...binding, installationId: 'outra'}), false);
  assert.equal(matchesNativeSessionBinding(session, {...binding, installationSecret: 'D'.repeat(43)}), false);
  assert.equal(matchesNativeSessionBinding(session, {...binding, contextRevision: 13}), false);
  assert.equal(matchesNativeSessionBinding(session, {...binding, expectedStoreId: 'matriz'}), true);
  assert.equal(matchesNativeSessionBinding(session, {...binding, expectedStoreId: 'garavelo'}), false);
});

test('sessão nativa exige as duas claims e token id não expõe o FCM token', () => {
  assert.equal(isNativeTerminalAuth({token: {
    androidOrderTerminal: true,
    terminalSessionId: 'session-1',
  }}), true);
  assert.equal(isNativeTerminalAuth({token: {androidOrderTerminal: true}}), false);
  const tokenId = getAndroidTerminalTokenId('installation-1');
  assert.match(tokenId, /^android_terminal_[a-f0-9]{64}$/);
  assert.equal(tokenId.includes('uid-1'), false);
  assert.equal(tokenId.includes('installation-1'), false);
});

test('troca de sessão revoga somente a sessão anterior da mesma instalação', () => {
  const previous = getReplacedTerminalSession({
    registrationSource: 'android_order_terminal',
    uid: 'uid-1',
    sessionId: '123e4567-e89b-42d3-a456-426614174000',
  }, 'uid-1', '123e4567-e89b-42d3-a456-426614174001');
  assert.deepEqual(previous, {
    uid: 'uid-1',
    sessionId: '123e4567-e89b-42d3-a456-426614174000',
  });
  assert.deepEqual(getReplacedTerminalSession({
    registrationSource: 'android_order_terminal',
    uid: 'uid-anterior',
    sessionId: '123e4567-e89b-42d3-a456-426614174002',
    token: 'token-compartilhado',
  }, 'uid-novo', '123e4567-e89b-42d3-a456-426614174003', 'token-compartilhado'), {
    uid: 'uid-anterior',
    sessionId: '123e4567-e89b-42d3-a456-426614174002',
  });
  assert.equal(getReplacedTerminalSession({
    registrationSource: 'android_order_terminal',
    uid: 'uid-anterior',
    sessionId: '123e4567-e89b-42d3-a456-426614174002',
    token: 'token-anterior',
  }, 'uid-novo', '123e4567-e89b-42d3-a456-426614174003', 'outro-token'), null);
  assert.equal(getReplacedTerminalSession({
    registrationSource: 'android_order_terminal',
    uid: 'uid-1',
    sessionId: '123e4567-e89b-42d3-a456-426614174001',
  }, 'uid-1', '123e4567-e89b-42d3-a456-426614174001'), null);
  assert.equal(getReplacedTerminalSession({
    registrationSource: 'web',
    uid: 'uid-1',
    sessionId: '123e4567-e89b-42d3-a456-426614174000',
  }, 'uid-1', '123e4567-e89b-42d3-a456-426614174001'), null);
});

test('sender prefere registro server-side somente no mesmo UID e FCM token', () => {
  const fakeDoc = (id, data) => ({id, data: () => data});
  const legacy = fakeDoc('token-fcm', {uid: 'uid-novo', platform: 'android'});
  const terminal = fakeDoc('android_terminal_hash', {
    uid: 'uid-novo',
    platform: 'android',
    token: 'token-fcm',
    registrationSource: 'android_order_terminal',
  });
  assert.deepEqual(deduplicateTokenDocs([legacy, terminal]), [terminal]);
  assert.deepEqual(deduplicateTokenDocs([terminal, legacy]), [terminal]);

  const otherUser = fakeDoc('token-fcm', {uid: 'uid-anterior', platform: 'android'});
  assert.deepEqual(deduplicateTokenDocs([otherUser, terminal]), [otherUser, terminal]);
});

test('troca de usuário remove o registro legado do mesmo FCM token', () => {
  const terminalRef = {path: 'notificationTokens/android_terminal_hash'};
  const legacyFromPreviousUid = {
    exists: true,
    ref: {path: 'notificationTokens/token-fcm'},
    data: () => ({uid: 'uid-anterior', token: 'token-fcm'}),
  };

  assert.equal(
      shouldDeleteLegacyTokenRegistration(legacyFromPreviousUid, terminalRef),
      true,
  );
  assert.equal(
      shouldDeleteLegacyTokenRegistration({
        ...legacyFromPreviousUid,
        ref: terminalRef,
      }, terminalRef),
      false,
  );
});

test('falha FCM transitória remanescente força retry do trigger', () => {
  const completed = {successCount: 2, failureCount: 1, retryableFailureCount: 0};
  assert.equal(throwIfRetryableDeliveryFailed(completed), completed);
  assert.throws(
      () => throwIfRetryableDeliveryFailed({retryableFailureCount: 2}),
      (error) => (
        error.code === 'messaging/retryable-delivery-failure' &&
        error.retryableFailureCount === 2
      ),
  );
});
