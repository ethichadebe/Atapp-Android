package com.ethichadebe.atapp;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.view.View;
import android.widget.RemoteViews;
import java.io.File;

/** The home-screen widget: today's art of the day, its title and artist. Tap to open. */
public class ArtWidget extends AppWidgetProvider {

    // A widget's picture travels to the launcher in a binder call, which has a
    // size limit; keep it small.
    private static final int MAX_PICTURE = 720;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        render(context, manager, ids);
        Daily.refreshNow(context);
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        render(context, manager, manager.getAppWidgetIds(new ComponentName(context, ArtWidget.class)));
    }

    private static void render(Context context, AppWidgetManager manager, int[] ids) {
        if (ids.length == 0) return;
        Today today = Today.saved(context);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_art);
        Bitmap picture = today == null ? null : loadScaled(today.image, MAX_PICTURE);
        if (picture != null) {
            views.setImageViewBitmap(R.id.widget_picture, picture);
            views.setViewVisibility(R.id.widget_picture, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_picture, View.GONE);
        }
        views.setTextViewText(R.id.widget_title, today == null ? context.getString(R.string.widget_loading) : today.title);
        views.setTextViewText(R.id.widget_artist, today == null ? "" : today.artist);
        Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        views.setOnClickPendingIntent(R.id.widget_root,
            PendingIntent.getActivity(context, 1, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        manager.updateAppWidget(ids, views);
    }

    /** The picture at most `max` px on its long side, or null. */
    static Bitmap loadScaled(File file, int max) {
        if (file == null || !file.isFile()) return null;
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(file.getPath(), bounds);
        int longest = Math.max(bounds.outWidth, bounds.outHeight);
        if (longest <= 0) return null;
        BitmapFactory.Options opts = new BitmapFactory.Options();
        opts.inSampleSize = Math.max(1, Integer.highestOneBit(longest / max));
        Bitmap b = BitmapFactory.decodeFile(file.getPath(), opts);
        if (b == null) return null;
        float scale = Math.min(1f, (float) max / Math.max(b.getWidth(), b.getHeight()));
        return scale < 1f ? Bitmap.createScaledBitmap(b, Math.round(b.getWidth() * scale), Math.round(b.getHeight() * scale), true) : b;
    }
}
