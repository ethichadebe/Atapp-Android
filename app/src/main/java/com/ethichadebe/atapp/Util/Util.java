package com.ethichadebe.atapp.Util;

import android.content.Context;
import android.content.SharedPreferences;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.Random;
import java.util.concurrent.ThreadLocalRandom;

public class Util {
    public static final String SHARED_PREFS = "SHAREDpREFS";
    public static final String SAVED_DATE = "SavedDate";

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

    public static String generateRandomWord() {
        int wordLength = ThreadLocalRandom.current().nextInt(3, 20 + 1);
        Random r = new Random(); // Initialize a Random Number Generator with SysTime as the seed
        StringBuilder sb = new StringBuilder(wordLength);
        for (int i = 0; i < wordLength; i++) { // For each letter in the word
            char tmp = (char) ('a' + r.nextInt('z' - 'a')); // Generate a letter between a and z
            sb.append(tmp); // Add it to the String
        }
        return sb.toString();
    }
}
