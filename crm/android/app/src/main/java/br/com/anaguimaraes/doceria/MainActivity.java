package br.com.anaguimaraes.doceria;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 101;
    private static final String PUSH_PREFERENCES = "ana_push_notifications";
    private static final String PUSH_TOKEN_KEY = "fcm_token";
    private static final String NOTIFICATION_URL_KEY = "notification_url";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleNotificationIntent(getIntent());
        String currentUserAgent = bridge.getWebView().getSettings().getUserAgentString();
        if (currentUserAgent == null || !currentUserAgent.contains("AnaGuimaraesAndroidApp/")) {
            bridge.getWebView().getSettings().setUserAgentString(
                    (currentUserAgent == null ? "" : currentUserAgent) + " AnaGuimaraesAndroidApp/1.0"
            );
        }
        bridge.getWebView().addJavascriptInterface(new AnaAndroidBridge(), "AnaAndroidBridge");
        refreshPushToken();
        requestCriticalPermissions();
    }

    @Override
    public void onResume() {
        super.onResume();
        MediaPlaybackService.stopAlarm(this);
        publishPushToken(getStoredPushToken());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNotificationIntent(intent);
    }

    private SharedPreferences pushPreferences() {
        return getSharedPreferences(PUSH_PREFERENCES, MODE_PRIVATE);
    }

    private String getStoredPushToken() {
        return pushPreferences().getString(PUSH_TOKEN_KEY, "");
    }

    private void refreshPushToken() {
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult() == null) {
                return;
            }
            String token = task.getResult().trim();
            if (token.isEmpty()) {
                return;
            }
            pushPreferences().edit().putString(PUSH_TOKEN_KEY, token).apply();
            publishPushToken(token);
        });
    }

    private void publishPushToken(String token) {
        if (token == null || token.trim().isEmpty() || bridge == null || bridge.getWebView() == null) {
            return;
        }

        String quotedToken = JSONObject.quote(token.trim());
        String javascript =
                "window.__anaAndroidPushTokenSync=" + quotedToken + ";" +
                "if(typeof window.__anaAndroidRegisterPushToken==='function'){" +
                "window.__anaAndroidRegisterPushToken(" + quotedToken + ");}" +
                "window.dispatchEvent(new CustomEvent('ana-android-push-token'," +
                "{detail:{token:" + quotedToken + "}}));";
        bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript(javascript, null));
    }

    private void handleNotificationIntent(Intent intent) {
        if (intent == null) {
            return;
        }
        String notificationUrl = intent.getStringExtra(NOTIFICATION_URL_KEY);
        if (notificationUrl != null && !notificationUrl.trim().isEmpty()) {
            pushPreferences().edit().putString(NOTIFICATION_URL_KEY, notificationUrl.trim()).apply();
        }
    }

    private final class AnaAndroidBridge {
        @JavascriptInterface
        public String getPushToken() {
            return getStoredPushToken();
        }

        @JavascriptInterface
        public void requestPushToken() {
            runOnUiThread(MainActivity.this::refreshPushToken);
        }

        @JavascriptInterface
        public String consumeNotificationUrl() {
            String url = pushPreferences().getString(NOTIFICATION_URL_KEY, "");
            if (!url.isEmpty()) {
                pushPreferences().edit().remove(NOTIFICATION_URL_KEY).apply();
            }
            return url;
        }

        @JavascriptInterface
        public void onWebSignedOut() {
            // O token do dispositivo é preservado para ser associado novamente
            // somente depois do próximo login autenticado.
        }
    }

    private void requestCriticalPermissions() {
        List<String> permissionsToRequest = new ArrayList<>();

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }


        if (ContextCompat.checkSelfPermission(this, Manifest.permission.MODIFY_AUDIO_SETTINGS)
                != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.WAKE_LOCK)
                != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.WAKE_LOCK);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS);
        }

        if (!permissionsToRequest.isEmpty()) {
            ActivityCompat.requestPermissions(
                    this,
                    permissionsToRequest.toArray(new String[0]),
                    PERMISSION_REQUEST_CODE
            );
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == PERMISSION_REQUEST_CODE) {
            for (int i = 0; i < permissions.length; i++) {
                if (grantResults.length > i && grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    continue;
                }
            }
        }
    }
}
