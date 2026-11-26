package com.ethichadebe.atapp;

import android.content.Context;
import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.Calendar;
import java.util.concurrent.TimeUnit;

/**
 * Background work: each morning, fetch the art of the day, refresh the widget
 * and post the notification; and on demand (the app opening, a widget being
 * added), refresh the widget without notifying.
 */
final class Daily {

    /** When the morning notification comes, in the phone's own time. */
    static final int HOUR = 8;

    private Daily() {}

    static void schedule(Context context) {
        PeriodicWorkRequest morning = new PeriodicWorkRequest.Builder(DailyWorker.class, 24, TimeUnit.HOURS)
            .setInitialDelay(millisUntil(HOUR, Calendar.getInstance()), TimeUnit.MILLISECONDS)
            .setConstraints(online())
            .setInputData(new Data.Builder().putBoolean(DailyWorker.NOTIFY, true).build())
            .build();
        WorkManager.getInstance(context).enqueueUniquePeriodicWork("morning", ExistingPeriodicWorkPolicy.KEEP, morning);
    }

    static void refreshNow(Context context) {
        OneTimeWorkRequest now = new OneTimeWorkRequest.Builder(DailyWorker.class).setConstraints(online()).build();
        WorkManager.getInstance(context).enqueueUniqueWork("refresh", ExistingWorkPolicy.REPLACE, now);
    }

    /** Milliseconds from `now` until the next `hour`:00. */
    static long millisUntil(int hour, Calendar now) {
        Calendar next = (Calendar) now.clone();
        next.set(Calendar.HOUR_OF_DAY, hour);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (!next.after(now)) next.add(Calendar.DAY_OF_MONTH, 1);
        return next.getTimeInMillis() - now.getTimeInMillis();
    }

    private static Constraints online() {
        return new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
    }
}
