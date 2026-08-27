import {
  buildNotificationTokenRecord,
  normalizePushToken,
  parseNotificationNavigation,
} from './notificationCore';

describe('notifications', () => {
  test('normaliza token e cria registro sem permitir escopo de loja', () => {
    const record = buildNotificationTokenRecord({
      uid: 'user-1',
      platform: 'android',
      devicePlatform: 'Android',
      userAgent: 'AnaGuimaraesAndroidApp/1.0',
      updatedAt: 'server-time',
    });

    expect(normalizePushToken('  token-fcm  ')).toBe('token-fcm');
    expect(record).toMatchObject({
      uid: 'user-1',
      platform: 'android',
      devicePlatform: 'Android',
      userAgent: 'AnaGuimaraesAndroidApp/1.0',
      updatedAt: 'server-time',
    });
    expect(record).not.toHaveProperty('lojaId');
    expect(record).not.toHaveProperty('lojaIds');
  });

  test('interpreta somente navegacao valida para um pedido', () => {
    expect(parseNotificationNavigation(
      '/?page=pedidos&orderId=pedido-123&lojaId=matriz'
    )).toEqual({page: 'pedidos', orderId: 'pedido-123', lojaId: 'matriz'});
    expect(parseNotificationNavigation('/?page=clientes&orderId=pedido-123')).toBeNull();
    expect(parseNotificationNavigation('/?page=pedidos')).toBeNull();
  });
});
