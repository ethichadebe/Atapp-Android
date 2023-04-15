package com.ethichadebe.atapp.Util;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.Random;
import java.util.concurrent.ThreadLocalRandom;

public class Util {
    public static final String SHARED_PREFS = "SHAREDpREFS";
    public static final String SAVED_DATE = "SavedDate";

    public static final int LIGHT_VIBRANT = 0;
    public static final int DARK_VIBRANT = 1;

    public static String currentTime() {
        Date c = Calendar.getInstance().getTime();
        System.out.println("Current time => " + c);

        SimpleDateFormat df = new SimpleDateFormat("mm", Locale.getDefault());
        String formattedDate = df.format(c);

        return formattedDate;
    }

    public boolean saveArray(String[] array, Context mContext) {
        SharedPreferences prefs = mContext.getSharedPreferences(SHARED_PREFS, 0);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putInt(SAVED_DATE + "_size", array.length);
        for (int i = 0; i < array.length; i++)
            editor.putString(SAVED_DATE + "_" + i, array[i]);
        return editor.commit();
    }

    public String[] loadArray(Context mContext) {
        SharedPreferences prefs = mContext.getSharedPreferences(SHARED_PREFS, 0);
        int size = prefs.getInt(SAVED_DATE + "_size", 0);
        String array[] = new String[size];
        for (int i = 0; i < size; i++)
            array[i] = prefs.getString(SAVED_DATE + "_" + i, null);
        return array;
    }
}
