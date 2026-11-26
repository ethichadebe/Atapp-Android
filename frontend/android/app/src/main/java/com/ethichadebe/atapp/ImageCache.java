package com.ethichadebe.atapp;

import android.content.Context;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

/**
 * Today's artwork images, saved on the phone so the app works offline once
 * the day's art has loaded. Files live in the app's own storage, named by a
 * hash of their URL; anything not in today's set is deleted.
 */
final class ImageCache {

    private static final int TIMEOUT_MS = 20000;

    private ImageCache() {}

    static File dir(Context context) {
        File dir = new File(context.getFilesDir(), "art");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        return dir;
    }

    static String fileName(String url) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-1").digest(url.getBytes(StandardCharsets.UTF_8));
            StringBuilder name = new StringBuilder();
            for (byte b : digest) name.append(String.format("%02x", b));
            return name.append(".jpg").toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** The saved copy of this image, downloading it first if needed. Null if it can't be had. */
    static File save(Context context, String url) {
        File file = new File(dir(context), fileName(url));
        if (file.length() > 0) return file;
        File part = new File(file.getPath() + ".part");
        try {
            download(url, part);
            return part.renameTo(file) ? file : null;
        } catch (IOException e) {
            //noinspection ResultOfMethodCallIgnored
            part.delete();
            return null;
        }
    }

    /** Delete every saved image except these. */
    static void keepOnly(Context context, Collection<String> urls) {
        Set<String> keep = new HashSet<>();
        for (String url : urls) keep.add(fileName(url));
        File[] files = dir(context).listFiles();
        if (files == null) return;
        for (File f : files) {
            if (!keep.contains(f.getName())) {
                //noinspection ResultOfMethodCallIgnored
                f.delete();
            }
        }
    }

    static void download(String url, File to) throws IOException {
        if (!url.startsWith("https://")) throw new IOException("not https: " + url);
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(TIMEOUT_MS);
        conn.setReadTimeout(TIMEOUT_MS);
        try {
            if (conn.getResponseCode() != 200) throw new IOException("HTTP " + conn.getResponseCode());
            try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(to)) {
                byte[] buf = new byte[16384];
                for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
            }
        } finally {
            conn.disconnect();
        }
    }
}
