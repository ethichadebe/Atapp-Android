package com.ethichadebe.atapp;

import android.Manifest;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

/**
 * The app: the website's React app in a WebView (Capacitor), plus what only an
 * Android app can do — the launcher icon follows the dancer, a morning
 * notification with the art of the day, a home-screen widget.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AtappPlugin.class);
        super.onCreate(savedInstanceState);
        DailyWorker.createChannel(this);
        Daily.schedule(this);
        Daily.refreshNow(this);
        askForNotificationsOnce();
    }

    @Override
    public void onStop() {
        super.onStop();
        // The app is out of sight: now the launcher icon can change.
        if (!isChangingConfigurations()) IconSwitcher.applyPending(this);
    }

    /** Android 13+ asks before an app may notify. Ask once; the user can change it in Settings. */
    private void askForNotificationsOnce() {
        if (Build.VERSION.SDK_INT < 33) return;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
        SharedPreferences prefs = getSharedPreferences("atapp.asked", MODE_PRIVATE);
        if (prefs.getBoolean("notifications", false)) return;
        prefs.edit().putBoolean("notifications", true).apply();
        requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, 1);
    }
}
