const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(projectRoot, ...parts));
const readText = (...parts) => read(...parts).toString('utf8');
const sha256 = (contents) => crypto.createHash('sha256').update(contents).digest('hex');

test('web e Android empacotam exatamente o mesmo áudio oficial', () => {
  const officialHash = sha256(read('crm', 'public', 'audio', 'alarm.mp3'));
  const androidHash = sha256(read('crm', 'android', 'app', 'src', 'main', 'res', 'raw', 'alarm.mp3'));
  const legacyAndroidHash = sha256(read(
      'crm',
      'android',
      'app',
      'src',
      'main',
      'res',
      'raw',
      'mixkit_vintage_warning_alarm_990.mp3',
  ));

  assert.equal(androidHash, officialHash);
  assert.equal(legacyAndroidHash, officialHash);
});

test('Service Worker possui uma única fonte de push e usa o áudio oficial como contrato', () => {
  const serviceWorker = readText('crm', 'public', 'firebase-messaging-sw.js');

  assert.match(serviceWorker, /DEFAULT_AUDIO_URL = '\/audio\/alarm\.mp3'/);
  assert.equal((serviceWorker.match(/onBackgroundMessage/g) || []).length, 1);
  assert.doesNotMatch(serviceWorker, /addEventListener\(['"]push['"]/);
  assert.doesNotMatch(serviceWorker, /PLAY_ORDER_SOUND/);
  assert.match(serviceWorker, /data\.alertAllowed === 'false'/);
});

test('Web preserva pausa e só delega áudio ao terminal standalone validado', () => {
  const appSource = readText('crm', 'src', 'App.js');
  const bridgeSource = readText('crm', 'src', 'utils', 'androidOrderTerminalBridge.js');

  assert.doesNotMatch(appSource, /Novo pedido recebido durante a pausa\. Reativando o alarme/);
  assert.doesNotMatch(appSource, /Nova ID Pendente detectada durante a pausa\. Reativando o alarme/);
  assert.match(appSource, /postAndroidOrderTerminalMessage\('operational_state'/);
  assert.match(appSource, /postAndroidOrderTerminalMessage\('logout'/);
  assert.match(appSource, /maxAutomaticAttempts = 4/);
  assert.match(appSource, /isStandaloneAndroidOrderTerminal && androidTerminalSessionReady/);
  assert.doesNotMatch(appSource, /if \(isStandaloneAndroidOrderTerminal\) \{\s*stopAlarm\(\)/);
  assert.match(appSource, /window\.addEventListener\('online', retryAfterExternalSignal\)/);
  assert.match(appSource, /window\.addEventListener\('focus', retryAfterExternalSignal\)/);
  assert.match(appSource, /postAndroidOrderTerminalMessage\('operational_context_cleared'/);
  assert.match(appSource, /unregisterDeviceForPush\(uid, token\)/);
  assert.match(bridgeSource, /AnaGuimaraesAndroidApp\//);
  assert.match(bridgeSource, /Capacitor\.isNativePlatform\(\)/);
});

test('Android legado usa dedupe, preserva a pausa por usuário e loja e mantém um único player sonoro', () => {
  const messagingService = readText(
      'crm',
      'android',
      'app',
      'src',
      'main',
      'java',
      'br',
      'com',
      'anaguimaraes',
      'doceria',
      'DoceriaFirebaseMessagingService.java',
  );
  const playbackService = readText(
      'crm',
      'android',
      'app',
      'src',
      'main',
      'java',
      'br',
      'com',
      'anaguimaraes',
      'doceria',
      'MediaPlaybackService.java',
  );

  assert.match(messagingService, /OrderAlertDedupeStore\.claim/);
  assert.match(messagingService, /AlarmPausePlugin\.getPausedUntil/);
  assert.doesNotMatch(messagingService, /AlarmPausePlugin\.clearPause/);
  assert.match(messagingService, /alertAllowedByBackend/);
  assert.match(messagingService, /showSilentNotification/);
  assert.match(messagingService, /CURRENT_UID_KEY/);
  assert.match(messagingService, /CURRENT_STORE_KEY/);
  assert.match(playbackService, /MediaPlayer\.create\(this, R\.raw\.alarm\)/);
  assert.match(playbackService, /channel\.setSound\(null, null\)/);

  const pauseCheck = messagingService.indexOf('AlarmPausePlugin.getPausedUntil');
  const foregroundHandoff = messagingService.indexOf('if (appInForeground)', pauseCheck);
  const silentNotification = messagingService.indexOf('showSilentNotification', foregroundHandoff);
  const alarmStart = messagingService.indexOf('MediaPlaybackService.startAlarm', silentNotification);
  assert.ok(
      pauseCheck >= 0 && foregroundHandoff > pauseCheck &&
      silentNotification > foregroundHandoff && alarmStart > silentNotification,
  );
  assert.match(messagingService.slice(foregroundHandoff, alarmStart), /return;/);
});

test('Function preserva pausas e calcula alertAllowed por destinatário', () => {
  const terminalFunctions = readText('functions', 'android-order-terminal.js');

  assert.match(terminalFunctions, /getPausesByUid/);
  assert.match(terminalFunctions, /pausedUntil: pausesByUid\.get\(uid\) \|\| 0/);
  assert.match(
      terminalFunctions,
      /const alertAllowed = Boolean\(storeOpen\) && Number\(pendingCount\) > 0 && !Number\(pausedUntil\)/,
  );
  assert.doesNotMatch(terminalFunctions, /collectionGroup\(['"]alarmPauses['"]\)/);
  assert.doesNotMatch(terminalFunctions, /clearInterruptedAlarmPauses/);
});

test('registro do terminal substitui sessão da instalação e deduplica token legado', () => {
  const terminalFunctions = readText('functions', 'android-order-terminal.js');

  assert.match(terminalFunctions, /getAndroidTerminalTokenId\(installationId\)/);
  assert.match(terminalFunctions, /deduplicateTokenDocs\(candidateDocs\)/);
  assert.match(terminalFunctions, /revokedReason: 'installation_session_replaced'/);
});
