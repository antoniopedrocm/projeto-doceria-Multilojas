package br.com.anaguimaraes.doceria;

import android.Manifest;
import android.app.ActivityManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.List;
import java.util.Map;

public class DoceriaFirebaseMessagingService extends FirebaseMessagingService {
    private static final String TAG = "DoceriaMessaging";
    private static final String MESSAGE_TYPE_NEW_ORDER = "new_order";
    private static final String SILENT_CHANNEL_ID = "doceria-orders-silent-v1";

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        getSharedPreferences("order_push", Context.MODE_PRIVATE)
                .edit()
                .putString("latest_fcm_token", token)
                .apply();
        Log.d(TAG, "Novo token FCM armazenado para sincronização no próximo login.");
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        String type = value(data, "type");
        String orderId = value(data, "orderId");
        String storeId = value(data, "storeId");
        if (!MESSAGE_TYPE_NEW_ORDER.equals(type) || orderId.isEmpty() || storeId.isEmpty()) {
            Log.d(TAG, "Mensagem ignorada porque não representa um novo pedido válido.");
            return;
        }

        SharedPreferences alarmPreferences = getSharedPreferences(
                AlarmPausePlugin.PREFERENCES_NAME,
                Context.MODE_PRIVATE
        );
        String currentUid = alarmPreferences.getString(AlarmPausePlugin.CURRENT_UID_KEY, "");
        if (currentUid == null || currentUid.trim().isEmpty()) {
            Log.d(TAG, "Mensagem ignorada porque não há usuário autenticado no aplicativo.");
            return;
        }
        currentUid = currentUid.trim();

        String targetUid = value(data, "targetUid");
        if (!targetUid.isEmpty() && !currentUid.equals(targetUid)) {
            Log.d(TAG, "Mensagem ignorada porque pertence a outro usuário.");
            return;
        }

        String currentStoreId = alarmPreferences.getString(AlarmPausePlugin.CURRENT_STORE_KEY, "");
        if (currentStoreId == null || !storeId.equals(currentStoreId.trim())) {
            Log.d(TAG, "Mensagem ignorada porque a loja não está ativa neste dispositivo.");
            return;
        }

        boolean appInForeground = isAppInForeground();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            Log.d(TAG, appInForeground
                    ? "Permissão de notificação ausente; alerta em primeiro plano ficará com a WebView."
                    : "Notificação ignorada porque a permissão do Android não foi concedida.");
            return;
        }

        if (!OrderAlertDedupeStore.claim(this, currentUid, storeId, orderId)) {
            Log.d(TAG, "Alerta duplicado ignorado para o pedido " + orderId + ".");
            return;
        }

        RemoteMessage.Notification notification = remoteMessage.getNotification();
        String title = notification != null ? notification.getTitle() : value(data, "title");
        String body = notification != null ? notification.getBody() : value(data, "body");
        String url = value(data, "url");

        if (title == null || title.isEmpty()) title = getString(R.string.app_name);
        if (body == null || body.isEmpty()) body = getString(R.string.notification_order_body);

        long pausedUntil = AlarmPausePlugin.getPausedUntil(this, currentUid, storeId);
        boolean alertAllowedByBackend = !"false".equalsIgnoreCase(value(data, "alertAllowed"));
        boolean audible = alertAllowedByBackend && pausedUntil <= System.currentTimeMillis();

        if (appInForeground) {
            Log.d(TAG, "Aplicativo em primeiro plano; o estado atual dos pedidos será tratado pela WebView.");
            return;
        }

        if (!audible) {
            showSilentNotification(title, body, url, orderId, storeId);
            Log.d(TAG, "Notificação visual exibida sem contornar a pausa ou o estado da loja.");
            return;
        }

        MediaPlaybackService.startAlarm(this, title, body, url, orderId, storeId);
    }

    private void showSilentNotification(
            String title,
            String body,
            String url,
            String orderId,
            String storeId
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null && manager.getNotificationChannel(SILENT_CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                        SILENT_CHANNEL_ID,
                        "Pedidos sem som",
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Notificações visuais quando o alerta sonoro está pausado.");
                channel.setSound(null, null);
                channel.enableVibration(false);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PRIVATE);
                manager.createNotificationChannel(channel);
            }
        }

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (!url.isEmpty()) openIntent.putExtra("notification_url", url);
        int immutableFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                ? PendingIntent.FLAG_IMMUTABLE
                : 0;
        PendingIntent contentIntent = PendingIntent.getActivity(
                this,
                (storeId + ":" + orderId).hashCode() & Integer.MAX_VALUE,
                openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag
        );
        Notification notification = new NotificationCompat.Builder(this, SILENT_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_EVENT)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
                .setContentIntent(contentIntent)
                .setAutoCancel(true)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .build();
        NotificationManagerCompat.from(this).notify(
                "new-order-" + storeId + "-" + orderId,
                2025,
                notification
        );
    }

    private static String value(Map<String, String> data, String key) {
        if (data == null) return "";
        String result = data.get(key);
        return result == null ? "" : result.trim();
    }

    private boolean isAppInForeground() {
        ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        if (activityManager == null) return false;

        List<ActivityManager.RunningAppProcessInfo> processes = activityManager.getRunningAppProcesses();
        if (processes == null) return false;

        for (ActivityManager.RunningAppProcessInfo process : processes) {
            if (process.uid == getApplicationInfo().uid) {
                return process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
                        || process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE;
            }
        }
        return false;
    }
}
