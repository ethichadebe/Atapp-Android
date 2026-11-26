# Atapp for Android

The website's React app (`frontend/src`), shipped inside a native Android shell
with [Capacitor](https://capacitorjs.com), plus what only an app can do. Same
package as the original app, `com.ethichadebe.atapp`, so it updates the
existing Play listing.

## What the app adds

| | Where |
| --- | --- |
| **Launcher icon follows the dancer.** Whoever danced on the opening screen becomes the app's icon. Android only picks from icons shipped in the app, so there is one launcher entry per dancer (`activity-alias` in `AndroidManifest.xml`) and one is on at a time. It switches when the app goes to the background, never while open. | `IconSwitcher.java`; icons from `tools/android/launcher_icons.py` |
| **Morning notification** with the art of the day, at 8:00 phone time, once a day. Android 13+ asks permission once; it can be turned off in the phone's settings. | `Daily.java`, `DailyWorker.java` |
| **Home-screen widget**: today's art of the day with its title and artist; tap to open. Refreshed each morning and whenever the app opens. | `ArtWidget.java`, `res/layout/widget_art.xml` |
| **Offline**: today's 10 and their pictures are kept on the phone; with no connection the app shows the last set it saved. | `frontend/src/native.ts`, `ImageCache.java` |
| Back closes the open sheet before leaving the app; the app draws under the status bar. | `Sheet.tsx`, `native.ts` |

The React app talks to Android through one small plugin, `AtappPlugin.java`
(`frontend/src/native.ts` on the JavaScript side). On the website none of it
runs.

## The server address and signing key

Neither is in this repository. Both come from the environment when the app is
built:

| | |
| --- | --- |
| `ATAPP_API_BASE` | the site's address, e.g. `https://example.com`; the app calls `<it>/api/...` |
| `ATAPP_VERSION_CODE` | a number higher than the last Play release (the native app's last was 6) |
| `ATAPP_KEYSTORE`, `ATAPP_KEYSTORE_PASSWORD`, `ATAPP_KEY_ALIAS`, `ATAPP_KEY_PASSWORD` | the upload key, for a release build |

## Building

Needs Node 22, JDK 21 and the Android SDK (platform 36).

```bash
npm ci
npm run build -w frontend
cd frontend && npx cap sync android && cd android
ATAPP_API_BASE=https://example.com ./gradlew assembleDebug      # app/build/outputs/apk/debug/app-debug.apk
./gradlew testDebugUnitTest
```

After changing the React app, run `npm run build -w frontend` and
`npx cap sync android` again: the app ships the built website inside it.

Launcher icons: after adding a dancer, cut its 512 px icon with
`tools/dancers/icon.py` into `tools/android/launcher/<dancer>.png`, add it to
`IconSwitcher.DANCERS` and an `Icon_<dancer>` entry to `AndroidManifest.xml`,
then run `python tools/android/launcher_icons.py`. `frontend/src/android.test.ts`
fails until all three agree with `dancers.ts`.

## Releasing to Google Play

CI builds the signed bundle: **Actions → Android → Run workflow**. It needs,
once, in the repository's **Settings → Secrets and variables → Actions**:

- variable `ATAPP_API_BASE`: the site's address
- secrets `ANDROID_KEYSTORE_BASE64` (`base64 -w0 upload.jks`),
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

The run's `atapp-play-bundle` artifact is the `.aab` to upload in the Play
Console (**Release → Production → Create new release**).

The upload key must be the one Play knows for this app. If the original app's
key is lost, the Play Console can reset the upload key (with Play App Signing):
**Setup → App signing → Request upload key reset**. To make a new key:

```bash
keytool -genkeypair -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Keep the keystore and its passwords out of this repository.
