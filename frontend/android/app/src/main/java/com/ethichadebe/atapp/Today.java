package com.ethichadebe.atapp;

import android.content.Context;
import android.content.SharedPreferences;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The art of the day, for the widget and the morning notification: fetched
 * from the server's /api/artworks/today and kept on the phone with its
 * picture, so the widget shows it offline too.
 */
final class Today {

    final String date;
    final String title;
    final String artist;
    final File image;

    Today(String date, String title, String artist, File image) {
        this.date = date;
        this.title = title;
        this.artist = artist;
        this.image = image;
    }

    private static final String PREFS = "atapp.today";

    /** The art of the day from the server's JSON; null when there is none yet. */
    static Today parse(String json, File image) throws JSONException {
        JSONObject body = new JSONObject(json);
        JSONObject artwork = body.optJSONObject("artwork");
        if (artwork == null) return null;
        String artist = artwork.isNull("artist") ? "" : artwork.optString("artist", "");
        return new Today(body.getString("date"), artwork.getString("title"), artist, image);
    }

    /** The smallest rendition the server offers: plenty for a widget or a notification. */
    static String imageUrl(String json) throws JSONException {
        JSONObject artwork = new JSONObject(json).optJSONObject("artwork");
        if (artwork == null) return null;
        JSONArray sizes = artwork.getJSONObject("image").getJSONArray("sizes");
        return sizes.length() == 0 ? null : sizes.getJSONObject(0).getString("url");
    }

    /** Fetch today's art and its picture; keep both. Null if the server has none. */
    static Today refresh(Context context, String apiBase) throws IOException, JSONException {
        String json = get(apiBase.replaceAll("/+$", "") + "/api/artworks/today");
        String url = imageUrl(json);
        File image = new File(context.getFilesDir(), "today.jpg");
        if (url != null) {
            File part = new File(context.getFilesDir(), "today.jpg.part");
            ImageCache.download(url, part);
            if (!part.renameTo(image)) throw new IOException("could not save today's picture");
        }
        Today today = parse(json, image);
        if (today != null) {
            prefs(context).edit()
                .putString("date", today.date)
                .putString("title", today.title)
                .putString("artist", today.artist)
                .apply();
        }
        return today;
    }

    /** The last art of the day fetched, or null before the first. */
    static Today saved(Context context) {
        SharedPreferences p = prefs(context);
        String date = p.getString("date", null);
        if (date == null) return null;
        return new Today(date, p.getString("title", ""), p.getString("artist", ""), new File(context.getFilesDir(), "today.jpg"));
    }

    private static String get(String url) throws IOException {
        if (!url.startsWith("https://")) throw new IOException("the server address must be https");
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(20000);
        conn.setReadTimeout(20000);
        try {
            if (conn.getResponseCode() != 200) throw new IOException("HTTP " + conn.getResponseCode());
            try (InputStream in = conn.getInputStream()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
                return out.toString(StandardCharsets.UTF_8.name());
            }
        } finally {
            conn.disconnect();
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
