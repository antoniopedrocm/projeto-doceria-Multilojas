export function normalizePushToken(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildNotificationTokenRecord({
  uid,
  platform,
  devicePlatform,
  userAgent,
  updatedAt,
}) {
  return {
    uid: uid || null,
    platform,
    devicePlatform: devicePlatform || 'unknown',
    userAgent: userAgent || '',
    updatedAt,
  };
}

export function parseNotificationNavigation(value) {
  try {
    const parsed = new URL(String(value || '/'), 'https://app.anaguimaraes.local');
    const page = parsed.searchParams.get('page') || '';
    const orderId = parsed.searchParams.get('orderId') || '';
    const lojaId = parsed.searchParams.get('lojaId') || '';
    if (page !== 'pedidos' || !orderId) return null;
    return {page, orderId, lojaId: lojaId || null};
  } catch (error) {
    return null;
  }
}
