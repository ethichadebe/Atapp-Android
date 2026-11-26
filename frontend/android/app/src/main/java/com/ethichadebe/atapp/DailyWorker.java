package com.ethichadebe.atapp;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/** Fetches the art of the day, refreshes the widget, and in the morning run, notifies. */
public class DailyWorker extends Worker {

    static final String NOTIFY = "notify";
    static final String CHANNEL = "daily";
    private static final int NOTIFICATION_ID = 1;

    public DailyWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        if (BuildConfig.API_BASE.isEmpty()) return Result.success(); // built without a server
        Today today;
        try {
            today = Today.refresh(context, BuildConfig.API_BASE);
        } catch (Exception e) {
            return getRunAttemptCount() < 3 ? Result.retry() : Result.failure();
        }
        ArtWidget.updateAll(context);
        if (today != null && getInputData().getBoolean(NOTIFY, false)) notify(context, today);
        return Result.success();
    }

    /** Once per day: the morning run may repeat, the notification doesn't. */
    private static void notify(Context context, Today today) {
        SharedPreferences prefs = context.getSharedPreferences("atapp.notified", Context.MODE_PRIVATE);
        if (today.date.equals(prefs.getString("date", null))) return;
        if (Build.VERSION.SDK_INT >= 33
            && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        createChannel(context);
        Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        String text = today.artist.isEmpty() ? today.title : today.title + " · " + today.artist;
        NotificationCompat.Builder n = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_atapp)
            .setContentTitle(context.getString(R.string.notification_title))
            .setContentText(text)
            .setContentIntent(tap)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT);
        Bitmap picture = ArtWidget.loadScaled(today.image, 1024);
        if (picture != null) {
            n.setLargeIcon(picture).setStyle(new NotificationCompat.BigPictureStyle().bigPicture(picture).bigLargeIcon((Bitmap) null).setSummaryText(text));
        }
        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, n.build());
        prefs.edit().putString("date", today.date).apply();
    }

    static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL, context.getString(R.string.notification_channel), NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription(context.getString(R.string.notification_channel_description));
        context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }
}
