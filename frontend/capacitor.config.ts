import type { CapacitorConfig } from "@capacitor/cli";

// The Android app: the same React app, shipped inside a native shell
// (frontend/android) that adds what a website can't do — a launcher icon that
// follows the dancer, a morning notification, a home-screen widget, and
// today's art kept for offline use. See frontend/android/README.md.
const config: CapacitorConfig = {
  appId: "com.ethichadebe.atapp",
  appName: "Atapp",
  webDir: "dist",
  plugins: {
    // Requests go through Android's own HTTP stack, so the API needs no CORS
    // rules for the app.
    CapacitorHttp: { enabled: true },
    // The React opening screen takes over from the system one at once.
    SplashScreen: { launchAutoHide: false },
  },
};

export default config;
