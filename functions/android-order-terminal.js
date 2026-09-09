const crypto = require('crypto');

const {
  buildNewOrderData,
  canUseOrdersModule,
  extractProfileStoreIds,
  isAlarmPauseActive,
  isNewPendingOrder,
  profileCanReceiveOrder,
} = require('./new-order-notifications');

const REGION = 'southamerica-east1';
const ANDROID_PACKAGE_NAME = 'br.com.anaguimaraes.doceria';
const TERMINAL_TOKEN_PREFIX = 'android_terminal_';
const TERMINAL_SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INSTALLATION_SECRET_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;
const NOTIFICATION_CLAIM_LEASE_MS = 2 * 60 * 1000;
const NOTIFICATION_EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
// Sessões operacionais expiram se o dispositivo deixar de renovar presença.
// O Android renova diariamente; a janela longa absorve Doze e períodos offline.
const TERMINAL_SESSION_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;
const CUSTOM_TOKEN_HANDOFF_VALIDITY_MS = 55 * 60 * 1000;
const DEFAULT_STORE_TIMEZONE = 'America/Sao_Paulo';

const OWNER_ROLES = new Set([
  'dono', 'owner', 'admin', 'adm', 'administrador', 'administradora',
  'administrador_master', 'administradora_master', 'admin_master', 'master',
  'superadmin',
]);
const ORDER_ROLES = new Set(['gerente', 'gestor', 'gestora', 'atendente']);
const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);
const RETRYABLE_MESSAGING_CODES = new Set([
  'messaging/internal-error',
  'messaging/server-unavailable',
  'messaging/unknown-error',
  'messaging/quota-exceeded',
]);

const normalizeString = (value, maxLength = 180) => (
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
);

const normalizeRole = (value) => normalizeString(value, 80).toLowerCase();

const parseTimeToMinutes = (value) => {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return (hours * 60) + minutes;
};

const getNowInTimeZone = (timezone, now = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || DEFAULT_STORE_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const weekdayRaw = parts.find((part) => part.type === 'weekday')?.value?.toLowerCase() || 'sun';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');
  const weekdayMap = {sun: 'sun', mon: 'mon', tue: 'tue', wed: 'wed', thu: 'thu', fri: 'fri', sat: 'sat'};
  const weekday = weekdayMap[weekdayRaw.slice(0, 3)] || 'sun';
  return {weekday, minutes: (hour * 60) + minute};
};

const shouldEnforceStoreOpenState = (storeConfig = {}) => {
  const overrideMode = storeConfig?.manualOverride?.mode || 'auto';
  if (overrideMode === 'force_open' || overrideMode === 'force_closed') return true;
  const schedule = storeConfig?.schedule || {};
  return Object.values(schedule).some((dayConfig) => dayConfig?.enabled === true);
};

const isStoreOpenNow = (storeConfig = {}, now = new Date()) => {
  const overrideMode = storeConfig?.manualOverride?.mode || 'auto';
  if (overrideMode === 'force_open') return true;
  if (overrideMode === 'force_closed') return false;
  // Preserve the existing web rule: stores without an enabled schedule are
  // considered open. A schedule only gates alerts after the merchant opts in.
  if (!shouldEnforceStoreOpenState(storeConfig)) return true;

  const timezone = storeConfig?.timezone || DEFAULT_STORE_TIMEZONE;
  const schedule = storeConfig?.schedule || {};
  const {weekday, minutes} = getNowInTimeZone(timezone, now);
  const todayConfig = schedule[weekday];
  if (!todayConfig || !todayConfig.enabled) return false;

  const openMinutes = parseTimeToMinutes(todayConfig.open);
  const closeMinutes = parseTimeToMinutes(todayConfig.close);
  if (openMinutes === null || closeMinutes === null || closeMinutes <= openMinutes) return false;
  return minutes >= openMinutes && minutes < closeMinutes;
};

const timestampToMillis = (value) => {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0;
};

const getSessionExpiresAtMillis = (session = {}) => (
  timestampToMillis(session.expiresAt) || timestampToMillis(session.expiresAtMillis)
);

const getActivePausedUntil = (pause, now = Date.now()) => (
  isAlarmPauseActive(pause, now) ? timestampToMillis(pause?.pausedUntil) : 0
);

const getTokenValue = (tokenDoc) => {
  const tokenData = tokenDoc?.data?.() || {};
  const storedToken = normalizeString(tokenData.token, 4096);
  // Registros nativos usam um id derivado da instalação, que nunca é um token
  // FCM válido. Isso também permite manter um tombstone sem reativá-lo por engano.
  if (tokenData.registrationSource === 'android_order_terminal') return storedToken;
  return storedToken || normalizeString(tokenDoc?.id, 4096);
};

const deduplicateTokenDocs = (tokenDocs = []) => {
  const byUidAndToken = new Map();
  tokenDocs.forEach((tokenDoc) => {
    const token = getTokenValue(tokenDoc);
    const uid = normalizeString(tokenDoc.data()?.uid, 180);
    if (!token || !uid) return;
    const key = `${uid}\u0000${token}`;
    const previous = byUidAndToken.get(key);
    const isTerminal = tokenDoc.data()?.registrationSource === 'android_order_terminal';
    const previousIsTerminal = previous?.data()?.registrationSource === 'android_order_terminal';
    if (!previous || (isTerminal && !previousIsTerminal)) byUidAndToken.set(key, tokenDoc);
  });
  return [...byUidAndToken.values()];
};

const shouldDeleteLegacyTokenRegistration = (legacyToken, terminalTokenRef) => (
  Boolean(legacyToken?.exists) &&
  Boolean(legacyToken?.ref?.path) &&
  legacyToken.ref.path !== terminalTokenRef?.path
);

const getAndroidTerminalTokenId = (installationId) => (
  `${TERMINAL_TOKEN_PREFIX}${crypto.createHash('sha256')
      .update(normalizeString(installationId, 200))
      .digest('hex')}`
);

const hashInstallationSecret = (installationSecret) => crypto.createHash('sha256')
    .update(normalizeString(installationSecret, 256))
    .digest('hex');

const matchesInstallationSecret = (storedHash, installationSecret) => {
  const normalizedHash = normalizeString(storedHash, 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalizedHash) ||
      !INSTALLATION_SECRET_PATTERN.test(normalizeString(installationSecret, 256))) {
    return false;
  }
  const candidateHash = hashInstallationSecret(installationSecret);
  return crypto.timingSafeEqual(Buffer.from(normalizedHash, 'hex'), Buffer.from(candidateHash, 'hex'));
};

const normalizeContextRevision = (value) => {
  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision > 0 ? revision : 0;
};

const resolveContextRevisionAction = (existingValue, incomingValue, isSameContext) => {
  const existingRevision = normalizeContextRevision(existingValue);
  const incomingRevision = normalizeContextRevision(incomingValue);
  if (!incomingRevision) return 'invalid';
  if (existingRevision > incomingRevision) return 'stale';
  if (existingRevision === incomingRevision && existingRevision > 0) {
    return isSameContext ? 'idempotent' : 'conflict';
  }
  return 'advance';
};

const matchesNativeSessionBinding = (session = {}, {
  installationId,
  installationSecret,
  contextRevision,
  expectedStoreId = '',
} = {}) => {
  if (normalizeString(session.installationId, 200) !== normalizeString(installationId, 200) ||
      !matchesInstallationSecret(session.installationSecretHash, installationSecret) ||
      normalizeContextRevision(session.contextRevision) !== normalizeContextRevision(contextRevision)) {
    return false;
  }
  return !expectedStoreId ||
    normalizeString(session.activeStoreId, 180) === normalizeString(expectedStoreId, 180);
};

const isNativeTerminalAuth = (authContext) => (
  authContext?.token?.androidOrderTerminal === true &&
  Boolean(normalizeString(authContext?.token?.terminalSessionId, 200))
);

const getRegisteredTerminalSession = (registration) => {
  if (registration?.registrationSource !== 'android_order_terminal') return null;
  const uid = normalizeString(registration.uid, 180);
  const sessionId = normalizeString(registration.sessionId, 200);
  if (!uid || !TERMINAL_SESSION_ID_PATTERN.test(sessionId)) return null;
  return {uid, sessionId};
};

const getReplacedTerminalSession = (registration, nextUid, nextSessionId, nextToken = '') => {
  const previousSession = getRegisteredTerminalSession(registration);
  if (!previousSession) return null;
  const {uid, sessionId} = previousSession;
  if (uid === nextUid && sessionId === nextSessionId) return null;
  if (uid !== nextUid &&
      normalizeString(registration.token, 4096) !== normalizeString(nextToken, 4096)) return null;
  return {uid, sessionId};
};

const buildAndroidNewOrderData = ({
  eventId,
  orderId,
  storeId,
  order,
  targetUid,
  sessionId,
  revision,
  pendingCount,
  storeOpen,
  pausedUntil,
  storeName,
  contextRevision,
}) => {
  const common = buildNewOrderData({orderId, storeId, order});
  const alertAllowed = Boolean(storeOpen) && Number(pendingCount) > 0 && !Number(pausedUntil);
  return {
    ...common,
    eventId: normalizeString(eventId, 180),
    targetUid: normalizeString(targetUid, 180),
    sessionId: normalizeString(sessionId, 200),
    revision: String(Math.max(0, Number(revision) || 0)),
    pendingCount: String(Math.max(0, Number(pendingCount) || 0)),
    storeOpen: String(Boolean(storeOpen)),
    alertAllowed: String(alertAllowed),
    pausedUntil: String(Math.max(0, Number(pausedUntil) || 0)),
    storeName: normalizeString(storeName, 180),
    contextRevision: String(normalizeContextRevision(contextRevision)),
  };
};

const buildAndroidOrderStateChangedData = ({
  eventId,
  orderId,
  storeId,
  targetUid,
  sessionId,
  revision,
  isPending,
  contextRevision,
}) => ({
  type: 'order_state_changed',
  eventId: normalizeString(eventId, 180),
  orderId: normalizeString(orderId, 180),
  storeId: normalizeString(storeId, 180),
  targetUid: normalizeString(targetUid, 180),
  sessionId: normalizeString(sessionId, 200),
  revision: String(Math.max(0, Number(revision) || 0)),
  isPending: String(Boolean(isPending)),
  contextRevision: String(normalizeContextRevision(contextRevision)),
});

const chunkValues = (values, size = 500) => {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const throwIfRetryableDeliveryFailed = (delivery = {}) => {
  const retryableFailureCount = Math.max(0, Number(delivery.retryableFailureCount) || 0);
  if (!retryableFailureCount) return delivery;
  const error = new Error(
      `Falha transitória ao entregar ${retryableFailureCount} notificação(ões).`,
  );
  error.code = 'messaging/retryable-delivery-failure';
  error.retryableFailureCount = retryableFailureCount;
  throw error;
};

const assertRequiredString = (HttpsError, data, field, maxLength) => {
  const value = normalizeString(data?.[field], maxLength);
  if (!value) {
    throw new HttpsError('invalid-argument', `Informe ${field}.`);
  }
  return value;
};

const assertInstallationSecret = (HttpsError, data) => {
  const value = assertRequiredString(HttpsError, data, 'installationSecret', 256);
  if (!INSTALLATION_SECRET_PATTERN.test(value)) {
    throw new HttpsError('invalid-argument', 'installationSecret inválido.');
  }
  return value;
};

const assertContextRevision = (HttpsError, data) => {
  const revision = normalizeContextRevision(data?.contextRevision);
  if (!revision) {
    throw new HttpsError('invalid-argument', 'contextRevision deve ser um inteiro positivo.');
  }
  return revision;
};

const createAndroidOrderTerminalFunctions = ({
  admin,
  db,
  auth,
  onCall,
  onDocumentCreated,
  onDocumentWritten,
  HttpsError,
  logger,
  resolveStoreOpenState = isStoreOpenNow,
}) => {
  const getProfileContext = async (uid) => {
    const [profileSnap, customProfileSnap] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('customProfiles').doc(uid).get(),
    ]);
    const profile = profileSnap.exists ? (profileSnap.data() || {}) : null;
    const customProfile = customProfileSnap.exists ? (customProfileSnap.data() || {}) : null;
    return {profile, customProfile};
  };

  const assertActiveProfile = async (request) => {
    const uid = normalizeString(request.auth?.uid, 180);
    if (!uid) throw new HttpsError('unauthenticated', 'Você precisa estar autenticado.');
    const context = await getProfileContext(uid);
    const profile = context.profile;
    if (!profile || profile.ativo === false || profile.authDisabled === true ||
        normalizeRole(profile.status) === 'inativo') {
      throw new HttpsError('permission-denied', 'Perfil ausente ou inativo.');
    }
    return {uid, ...context};
  };

  const assertOrderTerminalProfile = async (request) => {
    const context = await assertActiveProfile(request);
    const role = normalizeRole(context.profile.role);
    const isSupportedRole = OWNER_ROLES.has(role) || ORDER_ROLES.has(role);
    if (!isSupportedRole || !canUseOrdersModule(context.profile, context.customProfile)) {
      throw new HttpsError('permission-denied', 'Seu perfil não pode operar pedidos.');
    }
    return context;
  };

  const assertStoreAccess = async (request, storeId) => {
    if (storeId === '__all__') {
      throw new HttpsError('invalid-argument', 'Selecione uma loja específica.');
    }
    const context = await assertActiveProfile(request);
    if (!profileCanReceiveOrder(context.profile, storeId, context.customProfile)) {
      throw new HttpsError('permission-denied', 'Seu perfil não possui acesso a pedidos desta loja.');
    }
    const storeSnap = await db.collection('lojas').doc(storeId).get();
    if (!storeSnap.exists) throw new HttpsError('not-found', 'Loja não encontrada.');
    return context;
  };

  const getTerminalSessionRef = (uid, sessionId) => (
    db.collection('users').doc(uid).collection('androidOrderTerminalSessions').doc(sessionId)
  );

  const assertNativeSession = async (request, sessionId, {allowRevoked = false} = {}) => {
    if (!isNativeTerminalAuth(request.auth)) {
      throw new HttpsError('permission-denied', 'Esta operação exige uma sessão nativa do terminal.');
    }
    const claimedSessionId = normalizeString(request.auth.token.terminalSessionId, 200);
    if (claimedSessionId !== sessionId) {
      throw new HttpsError('permission-denied', 'A sessão informada não corresponde à autenticação.');
    }
    const uid = normalizeString(request.auth.uid, 180);
    const sessionSnap = await getTerminalSessionRef(uid, sessionId).get();
    const session = sessionSnap.data() || {};
    if (!sessionSnap.exists || session.uid !== uid || getSessionExpiresAtMillis(session) <= Date.now() ||
        (!allowRevoked && session.status !== 'active') ||
        (allowRevoked && !['active', 'revoked'].includes(session.status))) {
      throw new HttpsError('permission-denied', 'A sessão nativa expirou ou foi revogada.');
    }
    return {uid, sessionRef: sessionSnap.ref, session};
  };

  const assertBoundNativeSession = async (
      request,
      sessionId,
      {allowRevoked = false, expectedStoreId = ''} = {},
  ) => {
    const nativeSession = await assertNativeSession(request, sessionId, {allowRevoked});
    const installationId = assertRequiredString(
        HttpsError,
        request.data,
        'installationId',
        200,
    );
    const installationSecret = assertInstallationSecret(HttpsError, request.data);
    const contextRevision = assertContextRevision(HttpsError, request.data);
    const session = nativeSession.session;
    if (!matchesNativeSessionBinding(session, {
      installationId,
      installationSecret,
      contextRevision,
    })) {
      throw new HttpsError(
          'permission-denied',
          'A prova da instalação ou a revisão do contexto não corresponde à sessão.',
      );
    }
    if (expectedStoreId && normalizeString(session.activeStoreId, 180) !== expectedStoreId) {
      throw new HttpsError('failed-precondition', 'A loja não corresponde ao contexto ativo do terminal.');
    }
    return {...nativeSession, installationId, installationSecret, contextRevision};
  };

  const getOperationalRevisionRef = (storeId) => (
    db.collection('lojas').doc(storeId).collection('configuracoesInternas').doc('orderTerminal')
  );

  const readOperationalSnapshot = async (storeId, now = Date.now()) => {
    const storeRef = db.collection('lojas').doc(storeId);
    const pendingQuery = storeRef.collection('pedidos').where('status', '==', 'Pendente');
    const [pendingAggregate, storeSnap, infoSnap, configSnap, revisionSnap] = await Promise.all([
      pendingQuery.count().get(),
      storeRef.get(),
      storeRef.collection('info').doc('dados').get(),
      storeRef.collection('configuracoes').doc('config').get(),
      getOperationalRevisionRef(storeId).get(),
    ]);
    if (!storeSnap.exists) {
      throw new HttpsError('not-found', 'Loja não encontrada.');
    }
    const storeData = storeSnap.data() || {};
    const infoData = infoSnap.exists ? (infoSnap.data() || {}) : {};
    const configData = configSnap.exists ? (configSnap.data() || {}) : {};
    const revisionData = revisionSnap.exists ? (revisionSnap.data() || {}) : {};
    const storedAsOf = timestampToMillis(revisionData.asOf);
    return {
      storeId,
      pendingCount: pendingAggregate.data().count,
      storeOpen: resolveStoreOpenState(configData, new Date(now)),
      revision: Math.max(0, Number(revisionData.revision) || 0),
      asOf: Math.max(now, storedAsOf),
      storeName: normalizeString(
          storeData.nome || storeData.nomeFantasia || infoData.nome || infoData.nomeFantasia || storeId,
          180,
      ),
    };
  };

  const getAuthorizedOrderTokenDocs = async (storeId, {androidOnly = false} = {}) => {
    const tokensSnapshot = await db.collection('notificationTokens').get();
    if (tokensSnapshot.empty) return [];
    const candidateDocs = tokensSnapshot.docs.filter((snapshot) => {
      const data = snapshot.data() || {};
      if (!getTokenValue(snapshot)) return false;
      if (androidOnly && data.platform !== 'android') return false;
      if (data.registrationSource === 'android_order_terminal' &&
          !TERMINAL_SESSION_ID_PATTERN.test(normalizeString(data.sessionId, 200))) {
        return false;
      }
      if (data.registrationSource === 'android_order_terminal' &&
          (data.status !== 'active' || !normalizeContextRevision(data.contextRevision))) {
        return false;
      }
      if (data.registrationSource === 'android_order_terminal' && data.activeStoreId !== storeId) {
        return false;
      }
      if (data.platform === 'android' && data.activeStoreId && data.activeStoreId !== storeId) return false;
      return Boolean(normalizeString(data.uid, 180));
    });
    const deduplicatedCandidateDocs = deduplicateTokenDocs(candidateDocs);
    const userIds = [...new Set(deduplicatedCandidateDocs
        .map((snapshot) => normalizeString(snapshot.data()?.uid, 180)))];
    const profilesByUid = new Map();
    const customProfilesByUid = new Map();

    for (const userIdChunk of chunkValues(userIds, 100)) {
      const [profileSnapshots, customProfileSnapshots] = await Promise.all([
        db.getAll(...userIdChunk.map((uid) => db.collection('users').doc(uid))),
        db.getAll(...userIdChunk.map((uid) => db.collection('customProfiles').doc(uid))),
      ]);
      profileSnapshots.forEach((snapshot) => {
        if (snapshot.exists) profilesByUid.set(snapshot.id, snapshot.data() || {});
      });
      customProfileSnapshots.forEach((snapshot) => {
        if (snapshot.exists) customProfilesByUid.set(snapshot.id, snapshot.data() || {});
      });
    }

    const profileAuthorizedDocs = deduplicatedCandidateDocs.filter((snapshot) => {
      const uid = normalizeString(snapshot.data()?.uid, 180);
      return profileCanReceiveOrder(
          profilesByUid.get(uid),
          storeId,
          customProfilesByUid.get(uid),
      );
    });

    const terminalDocs = profileAuthorizedDocs.filter((snapshot) => (
      snapshot.data()?.registrationSource === 'android_order_terminal'
    ));
    const validTerminalPaths = new Set();
    for (const terminalDocChunk of chunkValues(terminalDocs, 100)) {
      const sessionSnapshots = await db.getAll(...terminalDocChunk.map((snapshot) => {
        const data = snapshot.data() || {};
        return getTerminalSessionRef(
            normalizeString(data.uid, 180),
            normalizeString(data.sessionId, 200),
        );
      }));
      sessionSnapshots.forEach((sessionSnapshot, index) => {
        const tokenDoc = terminalDocChunk[index];
        const tokenData = tokenDoc.data() || {};
        const session = sessionSnapshot.data() || {};
        if (sessionSnapshot.exists && session.status === 'active' &&
            session.uid === tokenData.uid && session.sessionId === tokenData.sessionId &&
            session.installationId === tokenData.installationId &&
            session.installationSecretHash === tokenData.installationSecretHash &&
            normalizeContextRevision(session.contextRevision) ===
              normalizeContextRevision(tokenData.contextRevision) &&
            normalizeString(session.activeStoreId, 180) === storeId &&
            getSessionExpiresAtMillis(session) > Date.now()) {
          validTerminalPaths.add(tokenDoc.ref.path);
        }
      });
    }

    return profileAuthorizedDocs.filter((snapshot) => (
      snapshot.data()?.registrationSource !== 'android_order_terminal' ||
      validTerminalPaths.has(snapshot.ref.path)
    ));
  };

  const getPausesByUid = async (tokenDocs, storeId, now) => {
    const uids = [...new Set(tokenDocs.map((snapshot) => normalizeString(snapshot.data()?.uid, 180)))];
    const pausesByUid = new Map();
    for (const uidChunk of chunkValues(uids, 100)) {
      const snapshots = await db.getAll(...uidChunk.map((uid) => (
        db.collection('users').doc(uid).collection('alarmPauses').doc(storeId)
      )));
      snapshots.forEach((snapshot, index) => {
        pausesByUid.set(uidChunk[index], snapshot.exists ? getActivePausedUntil(snapshot.data(), now) : 0);
      });
    }
    return pausesByUid;
  };

  const buildMessage = ({tokenDoc, data, highPriority}) => {
    const tokenData = tokenDoc.data() || {};
    const message = {
      token: getTokenValue(tokenDoc),
      data,
      android: {
        priority: highPriority ? 'high' : 'normal',
        ttl: 10 * 60 * 1000,
        restrictedPackageName: ANDROID_PACKAGE_NAME,
      },
    };
    if (tokenData.platform === 'web') {
      message.webpush = {
        headers: {
          Urgency: highPriority ? 'high' : 'normal',
          TTL: '600',
        },
      };
    }
    return message;
  };

  const sendMessages = async ({entries, highPriority, eventType, orderId}) => {
    const invalidTokenDocs = new Map();
    let pendingEntries = entries;
    let successCount = 0;
    let failureCount = 0;
    let retryableFailureCount = 0;

    for (let attempt = 1; attempt <= 2 && pendingEntries.length; attempt += 1) {
      const retryEntries = [];
      for (const entryChunk of chunkValues(pendingEntries)) {
        const messages = entryChunk.map((entry) => buildMessage({
          tokenDoc: entry.tokenDoc,
          data: entry.data,
          highPriority,
        }));
        const response = await admin.messaging().sendEach(messages);
        for (let index = 0; index < response.responses.length; index += 1) {
          const result = response.responses[index];
          if (result.success) {
            successCount += 1;
            continue;
          }
          const errorCode = result.error?.code || 'messaging/unknown-error';
          const entry = entryChunk[index];
          if (INVALID_TOKEN_CODES.has(errorCode)) {
            invalidTokenDocs.set(entry.tokenDoc.ref.path, {
              tokenDoc: entry.tokenDoc,
              sentToken: messages[index].token,
            });
            failureCount += 1;
          } else if (RETRYABLE_MESSAGING_CODES.has(errorCode)) {
            if (attempt === 1) {
              retryEntries.push(entry);
            } else {
              retryableFailureCount += 1;
            }
          } else {
            failureCount += 1;
          }
          logger.error('Falha ao enviar evento de pedido.', {attempt, errorCode, eventType, orderId});
        }
      }
      pendingEntries = retryEntries;
    }

    await Promise.all([...invalidTokenDocs.values()].map(({tokenDoc, sentToken}) => (
      db.runTransaction(async (transaction) => {
        const current = await transaction.get(tokenDoc.ref);
        if (current.exists && getTokenValue(current) === sentToken) {
          if (current.data()?.registrationSource === 'android_order_terminal') {
            transaction.set(tokenDoc.ref, {
              token: '',
              tokenHash: '',
              status: 'invalid_token',
              invalidatedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, {merge: true});
          } else {
            transaction.delete(tokenDoc.ref);
          }
        }
      }).catch((error) => {
        logger.error('Erro ao remover registro FCM inválido.', {
          platform: tokenDoc.data()?.platform || 'unknown',
          error,
        });
      })
    )));
    return {
      successCount,
      failureCount,
      retryableFailureCount,
      invalidTokenCount: invalidTokenDocs.size,
    };
  };

  const claimNotificationEvent = async ({eventKey, eventData, storeId}) => {
    const eventRef = db.collection('notificationEvents').doc(eventKey);
    const revisionRef = getOperationalRevisionRef(storeId);
    const now = Date.now();
    const result = await db.runTransaction(async (transaction) => {
      const [eventSnap, revisionSnap] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(revisionRef),
      ]);
      const previous = eventSnap.data() || {};
      if (eventSnap.exists && ['sent', 'partial_failure'].includes(previous.status)) {
        return {status: 'completed', revision: Number(previous.revision) || 0};
      }
      if (eventSnap.exists && previous.status === 'processing' && Number(previous.leaseUntil || 0) > now) {
        return {status: 'busy', revision: Number(previous.revision) || 0};
      }

      let revision = Number(previous.revision) || 0;
      if (!revision) {
        revision = Math.max(0, Number(revisionSnap.data()?.revision) || 0) + 1;
        transaction.set(revisionRef, {
          revision,
          asOf: admin.firestore.FieldValue.serverTimestamp(),
          updatedByEventId: eventKey,
        }, {merge: true});
      }
      transaction.set(eventRef, {
        ...eventData,
        revision,
        status: 'processing',
        leaseUntil: now + NOTIFICATION_CLAIM_LEASE_MS,
        attemptCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(now + NOTIFICATION_EVENT_RETENTION_MS),
      }, {merge: true});
      return {status: 'claimed', revision};
    });
    return {eventRef, ...result};
  };

  const finalizeNotificationEvent = async (eventRef, delivery, extra = {}) => {
    await eventRef.set({
      status: delivery.failureCount ? 'partial_failure' : 'sent',
      successCount: delivery.successCount,
      failureCount: delivery.failureCount,
      invalidTokenCount: delivery.invalidTokenCount,
      leaseUntil: 0,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      ...extra,
    }, {merge: true});
  };

  const failNotificationEvent = async (eventRef) => {
    await eventRef.set({
      status: 'failed',
      leaseUntil: 0,
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true}).catch(() => undefined);
  };

  const createAndroidOrderTerminalSession = onCall({region: REGION}, async (request) => {
    if (isNativeTerminalAuth(request.auth)) {
      throw new HttpsError('failed-precondition', 'A sessão nativa já foi criada.');
    }
    const {uid, profile, customProfile} = await assertOrderTerminalProfile(request);
    const role = normalizeRole(profile.role);
    const allowedStoreIds = extractProfileStoreIds(profile);
    const canAccessAllStores = OWNER_ROLES.has(role) && allowedStoreIds.length === 0;
    const sessionId = crypto.randomUUID();
    const createdAtMillis = Date.now();
    const handoffExpiresAt = createdAtMillis + CUSTOM_TOKEN_HANDOFF_VALIDITY_MS;
    const customToken = await auth.createCustomToken(uid, {
      androidOrderTerminal: true,
      terminalSessionId: sessionId,
    });
    await getTerminalSessionRef(uid, sessionId).set({
      uid,
      sessionId,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      // A sessão só recebe a janela móvel longa depois que o app comprova a
      // instalação e conclui o registro. Handoffs abandonados expiram em 55 min.
      expiresAt: admin.firestore.Timestamp.fromMillis(handoffExpiresAt),
      expiresAtMillis: handoffExpiresAt,
    });
    return {
      customToken,
      uid,
      sessionId,
      expiresAt: handoffExpiresAt,
      handoffExpiresAt,
      profile: {
        role,
        allowedStoreIds,
        canAccessAllStores,
        ordersAllowed: canUseOrdersModule(profile, customProfile),
      },
    };
  });

  const registerAndroidOrderDevice = onCall({region: REGION}, async (request) => {
    const token = assertRequiredString(HttpsError, request.data, 'token', 4096);
    const installationId = assertRequiredString(HttpsError, request.data, 'installationId', 200);
    const installationSecret = assertInstallationSecret(HttpsError, request.data);
    const installationSecretHash = hashInstallationSecret(installationSecret);
    const sessionId = assertRequiredString(HttpsError, request.data, 'sessionId', 200);
    const contextRevision = assertContextRevision(HttpsError, request.data);
    const activeStoreId = normalizeString(request.data?.activeStoreId, 180);
    const appVersion = assertRequiredString(HttpsError, request.data, 'appVersion', 100);
    const nativeSession = await assertNativeSession(request, sessionId);
    const {uid, profile} = activeStoreId ?
      await assertStoreAccess(request, activeStoreId) :
      await assertOrderTerminalProfile(request);
    const tokenRef = db.collection('notificationTokens').doc(
        getAndroidTerminalTokenId(installationId),
    );
    const legacyTokenRef = db.collection('notificationTokens').doc(token);
    const nowMillis = Date.now();
    const now = admin.firestore.FieldValue.serverTimestamp();
    const registrationResult = await db.runTransaction(async (transaction) => {
      const [existing, legacyToken, currentSessionSnap] = await Promise.all([
        transaction.get(tokenRef),
        transaction.get(legacyTokenRef),
        transaction.get(nativeSession.sessionRef),
      ]);
      const currentSession = currentSessionSnap.data() || {};
      if (!currentSessionSnap.exists || currentSession.uid !== uid ||
          currentSession.sessionId !== sessionId || currentSession.status !== 'active' ||
          getSessionExpiresAtMillis(currentSession) <= nowMillis) {
        throw new HttpsError('permission-denied', 'A sessão nativa foi revogada durante o registro.');
      }

      const existingRegistration = existing.data() || {};
      const existingIsTerminal = existing.exists &&
        existingRegistration.registrationSource === 'android_order_terminal';
      const storedInstallationSecretHash = normalizeString(
          existingRegistration.installationSecretHash,
          64,
      );
      if (existingIsTerminal && storedInstallationSecretHash &&
          !matchesInstallationSecret(storedInstallationSecretHash, installationSecret)) {
        throw new HttpsError('permission-denied', 'A prova desta instalação é inválida.');
      }
      if (existingIsTerminal && !storedInstallationSecretHash) {
        const canBindLegacyRegistration = existingRegistration.uid === uid &&
          existingRegistration.sessionId === sessionId &&
          existingRegistration.installationId === installationId &&
          existingRegistration.token === token;
        if (!canBindLegacyRegistration) {
          throw new HttpsError(
              'failed-precondition',
              'O registro legado precisa ser renovado pela sessão que o criou.',
          );
        }
      }
      if (currentSession.installationSecretHash &&
          !matchesInstallationSecret(currentSession.installationSecretHash, installationSecret)) {
        throw new HttpsError('permission-denied', 'A sessão está vinculada a outra instalação.');
      }
      if (currentSession.installationId && currentSession.installationId !== installationId) {
        throw new HttpsError('permission-denied', 'A sessão está vinculada a outra instalação.');
      }

      const existingContextRevision = existingIsTerminal ?
        normalizeContextRevision(existingRegistration.contextRevision) : 0;
      const isIdempotentContext = existingRegistration.uid === uid &&
        existingRegistration.sessionId === sessionId &&
        normalizeString(existingRegistration.activeStoreId, 180) === activeStoreId;
      const contextAction = resolveContextRevisionAction(
          existingContextRevision,
          contextRevision,
          isIdempotentContext,
      );
      if (contextAction === 'stale') {
        return {
          registered: false,
          stale: true,
          contextRevision: existingContextRevision,
          expiresAt: getSessionExpiresAtMillis(currentSession),
        };
      }
      if (contextAction === 'conflict') {
        throw new HttpsError(
            'failed-precondition',
            'contextRevision já foi usada por outro contexto da instalação.',
        );
      }

      const previousSession = getRegisteredTerminalSession(existingRegistration);
      const sessionIsChanging = previousSession && (
        previousSession.uid !== uid || previousSession.sessionId !== sessionId
      );
      const previousSessionRef = sessionIsChanging ?
        getTerminalSessionRef(previousSession.uid, previousSession.sessionId) : null;
      const previousSessionSnap = previousSessionRef ?
        await transaction.get(previousSessionRef) : null;
      const renewedExpiresAt = nowMillis + TERMINAL_SESSION_VALIDITY_MS;
      transaction.set(tokenRef, {
        token,
        tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
        uid,
        platform: 'android',
        registrationSource: 'android_order_terminal',
        status: 'active',
        installationId,
        installationSecretHash,
        sessionId,
        contextRevision,
        activeStoreId,
        appVersion,
        role: normalizeRole(profile.role),
        updatedAt: now,
        lastSeenAt: now,
        ...(existing.exists ? {} : {createdAt: now}),
      }, {merge: true});
      // O FCM token identifica a mesma instalação mesmo após troca de usuário.
      // Manter o documento legado do UID anterior faria o aparelho receber os
      // pedidos daquele usuário depois da troca de conta.
      if (shouldDeleteLegacyTokenRegistration(legacyToken, tokenRef)) {
        transaction.delete(legacyTokenRef);
      }
      if (previousSessionSnap?.exists) {
        transaction.set(previousSessionRef, {
          status: 'revoked',
          revokedAt: now,
          revokedReason: 'installation_session_replaced',
        }, {merge: true});
      }
      transaction.set(nativeSession.sessionRef, {
        installationId,
        installationSecretHash,
        activeStoreId,
        contextRevision,
        appVersion,
        lastSeenAt: now,
        expiresAt: admin.firestore.Timestamp.fromMillis(renewedExpiresAt),
        expiresAtMillis: renewedExpiresAt,
      }, {merge: true});
      return {
        registered: true,
        stale: false,
        contextRevision,
        expiresAt: renewedExpiresAt,
      };
    });
    return {
      ...registrationResult,
      uid,
      installationId,
      sessionId,
      activeStoreId,
    };
  });

  const unregisterAndroidOrderDevice = onCall({region: REGION}, async (request) => {
    const token = assertRequiredString(HttpsError, request.data, 'token', 4096);
    const installationId = assertRequiredString(HttpsError, request.data, 'installationId', 200);
    const installationSecret = assertInstallationSecret(HttpsError, request.data);
    const sessionId = assertRequiredString(HttpsError, request.data, 'sessionId', 200);
    const contextRevision = assertContextRevision(HttpsError, request.data);
    const nativeSession = await assertBoundNativeSession(
        request,
        sessionId,
        {allowRevoked: true},
    );
    const {uid} = nativeSession;
    const tokenRef = db.collection('notificationTokens').doc(
        getAndroidTerminalTokenId(installationId),
    );
    let unregistered = false;
    await db.runTransaction(async (transaction) => {
      const tokenSnap = await transaction.get(tokenRef);
      const registration = tokenSnap.data() || {};
      if (tokenSnap.exists && (registration.uid !== uid || registration.installationId !== installationId ||
          registration.sessionId !== sessionId || registration.token !== token ||
          normalizeContextRevision(registration.contextRevision) !== contextRevision ||
          !matchesInstallationSecret(registration.installationSecretHash, installationSecret))) {
        throw new HttpsError('permission-denied', 'O registro não pertence a esta sessão e instalação.');
      }
      if (tokenSnap.exists) {
        transaction.set(tokenRef, {
          token: '',
          tokenHash: '',
          status: 'unregistered',
          unregisteredAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
        unregistered = true;
      }
      transaction.set(nativeSession.sessionRef, {
        status: 'revoked',
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
    });
    return {unregistered, contextRevision};
  });

  const getAndroidOrderOperationalSnapshot = onCall({region: REGION}, async (request) => {
    const storeId = assertRequiredString(HttpsError, request.data, 'storeId', 180);
    let nativeContextRevision = 0;
    if (isNativeTerminalAuth(request.auth)) {
      const nativeSession = await assertBoundNativeSession(
          request,
          normalizeString(request.auth.token.terminalSessionId, 200),
          {expectedStoreId: storeId},
      );
      nativeContextRevision = nativeSession.contextRevision;
    }
    const {uid} = await assertStoreAccess(request, storeId);
    const now = Date.now();
    const [snapshot, pauseSnap] = await Promise.all([
      readOperationalSnapshot(storeId, now),
      db.collection('users').doc(uid).collection('alarmPauses').doc(storeId).get(),
    ]);
    return {
      ...snapshot,
      pausedUntil: pauseSnap.exists ? getActivePausedUntil(pauseSnap.data(), now) : 0,
      contextRevision: nativeContextRevision,
    };
  });

  const reactivateAndroidOrderAlerts = onCall({region: REGION}, async (request) => {
    const storeId = assertRequiredString(HttpsError, request.data, 'storeId', 180);
    let nativeContextRevision = 0;
    if (isNativeTerminalAuth(request.auth)) {
      const nativeSession = await assertBoundNativeSession(
          request,
          normalizeString(request.auth.token.terminalSessionId, 200),
          {expectedStoreId: storeId},
      );
      nativeContextRevision = nativeSession.contextRevision;
    }
    const {uid} = await assertStoreAccess(request, storeId);
    const pauseRef = db.collection('users').doc(uid).collection('alarmPauses').doc(storeId);
    const revisionRef = getOperationalRevisionRef(storeId);
    const revision = await db.runTransaction(async (transaction) => {
      const revisionSnap = await transaction.get(revisionRef);
      const nextRevision = Math.max(0, Number(revisionSnap.data()?.revision) || 0) + 1;
      transaction.delete(pauseRef);
      transaction.set(revisionRef, {
        revision: nextRevision,
        asOf: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: uid,
        updateType: 'alerts_reactivated',
      }, {merge: true});
      return nextRevision;
    });
    return {
      reactivated: true,
      uid,
      storeId,
      pausedUntil: 0,
      revision,
      contextRevision: nativeContextRevision,
      asOf: Date.now(),
    };
  });

  const notifyNewOrder = onDocumentCreated({
    document: 'lojas/{lojaId}/pedidos/{pedidoId}',
    region: REGION,
    retry: true,
  }, async (event) => {
    const order = event.data?.data();
    const orderId = normalizeString(event.params?.pedidoId, 180);
    const storeId = normalizeString(event.params?.lojaId, 180);
    if (!order || !orderId || !storeId || !isNewPendingOrder(order)) return;

    const eventKey = crypto.createHash('sha256').update(`${storeId}:${orderId}`).digest('hex');
    const claim = await claimNotificationEvent({
      eventKey,
      storeId,
      eventData: {
        type: 'new_order',
        orderId,
        storeId,
        triggerEventId: event.id || '',
      },
    });
    if (claim.status === 'completed') return;
    if (claim.status === 'busy') throw new Error(`Evento ${storeId}:${orderId} ainda está em processamento.`);

    try {
      const now = Date.now();
      const [tokenDocs, operational, currentOrderSnap] = await Promise.all([
        getAuthorizedOrderTokenDocs(storeId),
        readOperationalSnapshot(storeId, now),
        event.data.ref.get(),
      ]);
      if (!currentOrderSnap.exists || !isNewPendingOrder(currentOrderSnap.data())) {
        await finalizeNotificationEvent(
            claim.eventRef,
            {successCount: 0, failureCount: 0, invalidTokenCount: 0},
            {authorizedDeviceCount: 0, skippedReason: 'order_no_longer_pending'},
        );
        return;
      }
      const pausesByUid = await getPausesByUid(tokenDocs, storeId, now);
      const entries = tokenDocs.map((tokenDoc) => {
        const tokenData = tokenDoc.data() || {};
        const uid = normalizeString(tokenData.uid, 180);
        return {
          tokenDoc,
          data: buildAndroidNewOrderData({
            eventId: eventKey,
            orderId,
            storeId,
            order,
            targetUid: uid,
            sessionId: tokenData.sessionId || '',
            revision: claim.revision,
            pendingCount: operational.pendingCount,
            storeOpen: operational.storeOpen,
            pausedUntil: pausesByUid.get(uid) || 0,
            storeName: operational.storeName,
            contextRevision: tokenData.contextRevision,
          }),
        };
      });
      const delivery = entries.length ? await sendMessages({
        entries,
        highPriority: true,
        eventType: 'new_order',
        orderId,
      }) : {
        successCount: 0,
        failureCount: 0,
        retryableFailureCount: 0,
        invalidTokenCount: 0,
      };
      throwIfRetryableDeliveryFailed(delivery);
      await finalizeNotificationEvent(claim.eventRef, delivery, {
        authorizedDeviceCount: tokenDocs.length,
        interruptedPauseCount: 0,
      });
    } catch (error) {
      await failNotificationEvent(claim.eventRef);
      logger.error('Erro ao enviar notificações de novo pedido.', {orderId, storeId, error});
      throw error;
    }
  });

  const notifyOrderStateChanged = onDocumentWritten({
    document: 'lojas/{lojaId}/pedidos/{pedidoId}',
    region: REGION,
    retry: true,
  }, async (event) => {
    const beforeExists = Boolean(event.data?.before?.exists);
    if (!beforeExists) return;
    const beforePending = isNewPendingOrder(event.data?.before?.data());
    const afterPending = Boolean(event.data?.after?.exists) && isNewPendingOrder(event.data.after.data());
    if (beforePending === afterPending) return;

    const orderId = normalizeString(event.params?.pedidoId, 180);
    const storeId = normalizeString(event.params?.lojaId, 180);
    if (!orderId || !storeId) return;
    const triggerEventId = normalizeString(event.id, 180) || `${beforePending}:${afterPending}`;
    const eventKey = crypto.createHash('sha256')
        .update(`order_state_changed:${storeId}:${orderId}:${triggerEventId}`)
        .digest('hex');
    const claim = await claimNotificationEvent({
      eventKey,
      storeId,
      eventData: {
        type: 'order_state_changed',
        orderId,
        storeId,
        isPending: afterPending,
        triggerEventId,
      },
    });
    if (claim.status === 'completed') return;
    if (claim.status === 'busy') throw new Error(`Evento de estado ${eventKey} ainda está em processamento.`);

    try {
      const tokenDocs = await getAuthorizedOrderTokenDocs(storeId, {androidOnly: true});
      const entries = tokenDocs.map((tokenDoc) => {
        const tokenData = tokenDoc.data() || {};
        return {
          tokenDoc,
          data: buildAndroidOrderStateChangedData({
            eventId: eventKey,
            orderId,
            storeId,
            targetUid: tokenData.uid,
            sessionId: tokenData.sessionId || '',
            revision: claim.revision,
            isPending: afterPending,
            contextRevision: tokenData.contextRevision,
          }),
        };
      });
      const delivery = entries.length ? await sendMessages({
        entries,
        highPriority: false,
        eventType: 'order_state_changed',
        orderId,
      }) : {
        successCount: 0,
        failureCount: 0,
        retryableFailureCount: 0,
        invalidTokenCount: 0,
      };
      throwIfRetryableDeliveryFailed(delivery);
      await finalizeNotificationEvent(claim.eventRef, delivery, {
        authorizedDeviceCount: tokenDocs.length,
      });
    } catch (error) {
      await failNotificationEvent(claim.eventRef);
      logger.error('Erro ao enviar mudança de estado de pedido.', {orderId, storeId, error});
      throw error;
    }
  });

  return {
    createAndroidOrderTerminalSession,
    registerAndroidOrderDevice,
    unregisterAndroidOrderDevice,
    getAndroidOrderOperationalSnapshot,
    reactivateAndroidOrderAlerts,
    notifyNewOrder,
    notifyOrderStateChanged,
  };
};

module.exports = {
  CUSTOM_TOKEN_HANDOFF_VALIDITY_MS,
  TERMINAL_SESSION_VALIDITY_MS,
  buildAndroidNewOrderData,
  buildAndroidOrderStateChangedData,
  createAndroidOrderTerminalFunctions,
  deduplicateTokenDocs,
  getActivePausedUntil,
  getAndroidTerminalTokenId,
  getReplacedTerminalSession,
  getNowInTimeZone,
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
};
