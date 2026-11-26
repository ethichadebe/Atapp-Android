package com.ethichadebe.atapp;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import java.util.Arrays;
import java.util.List;

/**
 * The launcher icon follows the dancer: whoever danced on the opening screen
 * last is the app's icon. Android only picks from icons shipped in the app, so
 * there is one launcher entry (an activity-alias in AndroidManifest.xml) per
 * dancer, and exactly one of them is enabled at a time.
 *
 * Switching aliases while the app is on screen can close it on some
 * launchers, so the dancer is only remembered here, and the switch happens
 * when the app goes to the background.
 */
final class IconSwitcher {

    /** Every dancer, as in frontend/src/splash/dancers.ts. snoop is the icon on install. */
    static final List<String> DANCERS = Arrays.asList(
        "snoop", "zep", "chad", "milan", "satin", "afro", "leather", "studs", "balaclava", "cargo"
    );
    static final String DEFAULT = "snoop";

    private static final String PREFS = "atapp.icon";
    private static final String PENDING = "pending";
    private static final String CURRENT = "current";

    private IconSwitcher() {}

    /** The launcher entry for a dancer: com.ethichadebe.atapp.Icon_<dancer>. */
    static String alias(String dancer) {
        return MainActivity.class.getPackage().getName() + ".Icon_" + dancer;
    }

    /** Remember that this dancer should be the icon. Unknown names are ignored. */
    static void request(Context context, String dancer) {
        if (!DANCERS.contains(dancer)) return;
        prefs(context).edit().putString(PENDING, dancer).apply();
    }

    static String current(Context context) {
        return prefs(context).getString(CURRENT, DEFAULT);
    }

    /** Switch the launcher icon to the remembered dancer, if it changed. */
    static void applyPending(Context context) {
        SharedPreferences prefs = prefs(context);
        String next = prefs.getString(PENDING, null);
        if (next == null || next.equals(current(context))) return;
        PackageManager pm = context.getPackageManager();
        // Enable the new entry before disabling the others, so the app is
        // never without a launcher icon.
        set(pm, context, next, PackageManager.COMPONENT_ENABLED_STATE_ENABLED);
        for (String dancer : DANCERS) {
            if (!dancer.equals(next)) set(pm, context, dancer, PackageManager.COMPONENT_ENABLED_STATE_DISABLED);
        }
        prefs.edit().putString(CURRENT, next).remove(PENDING).apply();
    }

    private static void set(PackageManager pm, Context context, String dancer, int state) {
        pm.setComponentEnabledSetting(new ComponentName(context, alias(dancer)), state, PackageManager.DONT_KILL_APP);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
