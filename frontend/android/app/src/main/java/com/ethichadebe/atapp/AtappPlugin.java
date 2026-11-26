package com.ethichadebe.atapp;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONException;

/**
 * What the React app asks of Android (frontend/src/native.ts):
 *
 * - config(): the server the app talks to, set when the app is built.
 * - setDancer({id}): the dancer who just danced becomes the launcher icon.
 * - saveImages({urls}): keep today's images on the phone for offline use;
 *   resolves with {files: {url: path}} for the ones saved.
 */
@CapacitorPlugin(name = "Atapp")
public class AtappPlugin extends Plugin {

    private final ExecutorService downloads = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void config(PluginCall call) {
        JSObject result = new JSObject();
        result.put("apiBase", BuildConfig.API_BASE);
        call.resolve(result);
    }

    @PluginMethod
    public void setDancer(PluginCall call) {
        String id = call.getString("id");
        if (id != null) IconSwitcher.request(getContext(), id);
        call.resolve();
    }

    @PluginMethod
    public void saveImages(PluginCall call) {
        JSArray array = call.getArray("urls", new JSArray());
        List<String> urls = new ArrayList<>();
        try {
            for (int i = 0; i < array.length(); i++) urls.add(array.getString(i));
        } catch (JSONException e) {
            call.reject("urls must be strings");
            return;
        }
        downloads.execute(() -> {
            JSObject files = new JSObject();
            for (String url : urls) {
                File f = ImageCache.save(getContext(), url);
                if (f != null) files.put(url, f.getAbsolutePath());
            }
            ImageCache.keepOnly(getContext(), urls);
            JSObject result = new JSObject();
            result.put("files", files);
            call.resolve(result);
        });
    }
}
