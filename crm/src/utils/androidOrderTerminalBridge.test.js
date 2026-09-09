import { Capacitor } from '@capacitor/core';
import {
  hasStandaloneAndroidOrderTerminalBridge,
  isAllowedAndroidOrderTerminalStore,
  matchesAndroidOrderTerminalTargetUid,
  postAndroidOrderTerminalMessage,
  requestAndroidOrderTerminalSession,
} from './androidOrderTerminalBridge';

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
  },
}), {virtual: true});

describe('androidOrderTerminalBridge', () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    delete window.AnaOrderTerminal;
    Capacitor.isNativePlatform.mockReturnValue(false);
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 AnaGuimaraesAndroidApp/1.0',
    });
  });

  afterAll(() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    });
  });

  test('só detecta a interface standalone com postMessage', () => {
    expect(hasStandaloneAndroidOrderTerminalBridge()).toBe(false);
    window.AnaOrderTerminal = {};
    expect(hasStandaloneAndroidOrderTerminalBridge()).toBe(false);
    window.AnaOrderTerminal.postMessage = jest.fn();
    expect(hasStandaloneAndroidOrderTerminalBridge()).toBe(true);
  });

  test('não assume o áudio no runtime Capacitor existente', () => {
    window.AnaOrderTerminal = {postMessage: jest.fn()};
    Capacitor.isNativePlatform.mockReturnValue(true);
    expect(hasStandaloneAndroidOrderTerminalBridge()).toBe(false);
  });

  test('não suprime o áudio em browser comum mesmo se houver colisão de global', () => {
    window.AnaOrderTerminal = {postMessage: jest.fn()};
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 Chrome/140.0',
    });
    expect(hasStandaloneAndroidOrderTerminalBridge()).toBe(false);
  });

  test('envia envelope versionado em JSON', () => {
    const postMessage = jest.fn();
    window.AnaOrderTerminal = {postMessage};

    expect(postAndroidOrderTerminalMessage('operational_state', {uid: 'uid-1'})).toBe(true);
    expect(JSON.parse(postMessage.mock.calls[0][0])).toEqual({
      version: 1,
      type: 'operational_state',
      payload: {uid: 'uid-1'},
    });
  });

  test('só conclui o handoff da sessão após ACK correlacionado', async () => {
    const postMessage = jest.fn();
    window.AnaOrderTerminal = {postMessage};

    const handoff = requestAndroidOrderTerminalSession(
      {uid: 'uid-1', customToken: 'segredo-efêmero'},
      {timeoutMs: 1_000}
    );
    const request = JSON.parse(postMessage.mock.calls[0][0]);
    expect(request.type).toBe('session');
    expect(request.requestId).toBeTruthy();
    expect(request.payload.uid).toBe('uid-1');

    window.AnaOrderTerminal.onmessage({data: JSON.stringify({
      version: 1,
      type: 'session_ack',
      requestId: request.requestId,
      payload: {ok: true},
    })});

    await expect(handoff).resolves.toBe(true);
  });

  test('NACK correlacionado rejeita sem expor o token na mensagem', async () => {
    const postMessage = jest.fn();
    window.AnaOrderTerminal = {postMessage};
    const handoff = requestAndroidOrderTerminalSession(
      {uid: 'uid-1', customToken: 'segredo-efêmero'},
      {timeoutMs: 1_000}
    );
    const request = JSON.parse(postMessage.mock.calls[0][0]);

    window.AnaOrderTerminal.onmessage({data: JSON.stringify({
      version: 1,
      type: 'session_nack',
      requestId: request.requestId,
      payload: {ok: false, code: 'native_session_failed'},
    })});

    await expect(handoff).rejects.toThrow('não aceitou');
    await handoff.catch((error) => {
      expect(error.message).not.toContain('segredo-efêmero');
    });
  });

  test('timeout encerra a solicitação que não recebeu ACK', async () => {
    jest.useFakeTimers();
    try {
      window.AnaOrderTerminal = {postMessage: jest.fn()};
      const handoff = requestAndroidOrderTerminalSession(
        {uid: 'uid-1', customToken: 'segredo-efêmero'},
        {timeoutMs: 50}
      );
      const rejection = expect(handoff).rejects.toMatchObject({
        code: 'session_ack_timeout',
      });
      jest.advanceTimersByTime(51);
      await rejection;
    } finally {
      jest.useRealTimers();
    }
  });

  test('aceita apenas o usuário atual como destino quando o payload é direcionado', () => {
    expect(matchesAndroidOrderTerminalTargetUid('', 'uid-atual')).toBe(true);
    expect(matchesAndroidOrderTerminalTargetUid('uid-atual', 'uid-atual')).toBe(true);
    expect(matchesAndroidOrderTerminalTargetUid('uid-anterior', 'uid-atual')).toBe(false);
    expect(matchesAndroidOrderTerminalTargetUid('uid-atual', '')).toBe(false);
  });

  test('aceita somente uma loja específica presente no escopo carregado', () => {
    expect(isAllowedAndroidOrderTerminalStore('matriz', ['matriz', 'garavelo'])).toBe(true);
    expect(isAllowedAndroidOrderTerminalStore('outra', ['matriz', 'garavelo'])).toBe(false);
    expect(isAllowedAndroidOrderTerminalStore('__all__', ['__all__'])).toBe(false);
    expect(isAllowedAndroidOrderTerminalStore('', ['matriz'])).toBe(false);
  });
});
