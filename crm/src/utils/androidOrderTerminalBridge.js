import { Capacitor } from '@capacitor/core';

export const ANDROID_ORDER_TERMINAL_PROTOCOL_VERSION = 1;
export const ANDROID_ORDER_TERMINAL_USER_AGENT_MARKER = 'AnaGuimaraesAndroidApp/';
const SESSION_ACK_TIMEOUT_MS = 15_000;
const bridgeReplyState = new WeakMap();
let requestSequence = 0;

const bridgeError = (message, code, name = 'Error') => {
  const error = new Error(message);
  error.code = code;
  error.name = name;
  return error;
};

const getStandaloneBridge = () => {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return null;
  if (typeof navigator === 'undefined' ||
      !String(navigator.userAgent || '').includes(ANDROID_ORDER_TERMINAL_USER_AGENT_MARKER)) {
    return null;
  }
  const bridge = window.AnaOrderTerminal;
  if (!bridge || typeof bridge !== 'object' || typeof bridge.postMessage !== 'function') return null;
  return bridge;
};

export const hasStandaloneAndroidOrderTerminalBridge = () => Boolean(getStandaloneBridge());

export const matchesAndroidOrderTerminalTargetUid = (targetUid, currentUid) => {
  const normalizedTargetUid = String(targetUid || '').trim();
  const normalizedCurrentUid = String(currentUid || '').trim();
  return Boolean(normalizedCurrentUid) && (
    !normalizedTargetUid || normalizedTargetUid === normalizedCurrentUid
  );
};

export const isAllowedAndroidOrderTerminalStore = (storeId, availableStoreIds = []) => {
  const normalizedStoreId = String(storeId || '').trim();
  if (!normalizedStoreId || normalizedStoreId === '__all__' || !Array.isArray(availableStoreIds)) {
    return false;
  }
  return availableStoreIds.some((candidate) => String(candidate || '').trim() === normalizedStoreId);
};

export const postAndroidOrderTerminalMessage = (type, payload = {}) => {
  const bridge = getStandaloneBridge();
  if (!bridge || typeof type !== 'string' || !type.trim()) return false;

  try {
    bridge.postMessage(JSON.stringify({
      version: ANDROID_ORDER_TERMINAL_PROTOCOL_VERSION,
      type: type.trim(),
      payload: payload && typeof payload === 'object' ? payload : {},
    }));
    return true;
  } catch (error) {
    console.warn('[AndroidOrderTerminal] Falha ao enviar mensagem para a bridge:', error);
    return false;
  }
};

const nextRequestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  requestSequence += 1;
  return `terminal-${Date.now().toString(36)}-${requestSequence.toString(36)}`;
};

const parseBridgeReply = (event) => {
  try {
    const raw = event?.data;
    const reply = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!reply || Number(reply.version) !== ANDROID_ORDER_TERMINAL_PROTOCOL_VERSION) return null;
    const type = String(reply.type || '');
    if (!['session_ack', 'session_nack'].includes(type)) return null;
    const requestId = String(reply.requestId || '').trim();
    if (!requestId) return null;
    return {type, requestId, ok: reply.payload?.ok === true};
  } catch (error) {
    return null;
  }
};

const getBridgeReplyState = (bridge) => {
  const current = bridgeReplyState.get(bridge);
  if (current) return current;

  const pending = new Map();
  const previousOnMessage = typeof bridge.onmessage === 'function' ? bridge.onmessage : null;
  const onmessage = (event) => {
    const reply = parseBridgeReply(event);
    if (reply) {
      const request = pending.get(reply.requestId);
      if (request) {
        pending.delete(reply.requestId);
        clearTimeout(request.timeoutId);
        request.removeAbortListener?.();
        if (reply.type === 'session_ack' && reply.ok) {
          request.resolve(true);
        } else {
          request.reject(bridgeError(
            'O aplicativo não aceitou a sessão nativa.',
            'session_nack'
          ));
        }
      }
    }
    if (previousOnMessage) previousOnMessage.call(bridge, event);
  };
  bridge.onmessage = onmessage;
  const state = {pending, onmessage};
  bridgeReplyState.set(bridge, state);
  return state;
};

export const requestAndroidOrderTerminalSession = (
  payload,
  {timeoutMs = SESSION_ACK_TIMEOUT_MS, signal} = {}
) => {
  const bridge = getStandaloneBridge();
  if (!bridge) return Promise.reject(bridgeError(
    'Bridge do terminal Android indisponível.',
    'bridge_unavailable'
  ));
  if (signal?.aborted) return Promise.reject(bridgeError(
    'Handoff da sessão cancelado.',
    'session_aborted',
    'AbortError'
  ));

  const requestId = nextRequestId();
  const state = getBridgeReplyState(bridge);
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const request = state.pending.get(requestId);
      if (!request) return;
      state.pending.delete(requestId);
      request.removeAbortListener?.();
      reject(bridgeError(
        'O aplicativo não confirmou a sessão nativa a tempo.',
        'session_ack_timeout'
      ));
    }, Math.max(1, Number(timeoutMs) || SESSION_ACK_TIMEOUT_MS));
    const abort = () => {
      if (!state.pending.has(requestId)) return;
      state.pending.delete(requestId);
      clearTimeout(timeoutId);
      reject(bridgeError(
        'Handoff da sessão cancelado.',
        'session_aborted',
        'AbortError'
      ));
    };
    signal?.addEventListener('abort', abort, {once: true});
    state.pending.set(requestId, {
      resolve,
      reject,
      timeoutId,
      removeAbortListener: signal ? () => signal.removeEventListener('abort', abort) : null,
    });

    try {
      bridge.postMessage(JSON.stringify({
        version: ANDROID_ORDER_TERMINAL_PROTOCOL_VERSION,
        type: 'session',
        requestId,
        payload: payload && typeof payload === 'object' ? payload : {},
      }));
    } catch (error) {
      clearTimeout(timeoutId);
      state.pending.delete(requestId);
      signal?.removeEventListener('abort', abort);
      reject(bridgeError(
        'Falha ao entregar a sessão ao aplicativo Android.',
        'session_delivery_failed'
      ));
    }
  });
};
