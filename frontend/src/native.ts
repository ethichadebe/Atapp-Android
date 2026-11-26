import { Capacitor, registerPlugin } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import type { Artwork, DailySet } from "./api";

// What the Android app adds (frontend/android, AtappPlugin.java). On the
// website none of this runs: `inApp` is false and every call is a no-op.

interface AtappPlugin {
  config(): Promise<{ apiBase: string }>;
  setDancer(options: { id: string }): Promise<void>;
  saveImages(options: { urls: string[] }): Promise<{ files: Record<string, string> }>;
}

const Atapp = registerPlugin<AtappPlugin>("Atapp");

export const inApp = Capacitor.isNativePlatform();

let base: Promise<string> | null = null;

/**
 * Where the API is. The website uses its own /api; the app asks Android for
 * the site's address, which is set when the app is built (never stored here).
 */
export function apiBase(): Promise<string> {
  if (!inApp) return Promise.resolve("");
  base ??= Atapp.config()
    .then((c) => c.apiBase.replace(/\/+$/, ""))
    .catch(() => "");
  return base;
}

/**
 * Hand over from Android's launch screen to the app's own opening animation,
 * and draw the app under the status bar, its icons light in dark mode.
 */
export function startApp(): void {
  if (!inApp) return;
  void SplashScreen.hide({ fadeOutDuration: 0 }).catch(() => {});
  void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  const dark = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => void StatusBar.setStyle({ style: dark.matches ? Style.Dark : Style.Light }).catch(() => {});
  apply();
  dark.addEventListener("change", apply);
}

/** The dancer on the opening screen becomes the app's launcher icon. */
export function setLauncherDancer(id: string): void {
  if (inApp) Atapp.setDancer({ id }).catch(() => {});
}

// ── Offline ─────────────────────────────────────────────────────────────────

const SAVED = "daily";

/** The image the app shows for an artwork: the 800 px rendition, or the nearest. */
export function displayImage(a: Artwork): string {
  const sizes = a.image.sizes;
  return sizes[Math.min(1, sizes.length - 1)].url;
}

/**
 * Keep today's set and its images on the phone. The images are saved by
 * Android; the set is stored with each artwork pointing at its saved picture.
 */
export async function saveForOffline(set: DailySet): Promise<void> {
  if (!inApp) return;
  const urls = set.artworks.map(displayImage);
  const { files } = await Atapp.saveImages({ urls });
  const withFiles: DailySet = {
    ...set,
    artworks: set.artworks.map((a) => {
      const file = files[displayImage(a)];
      return file ? { ...a, localImage: Capacitor.convertFileSrc(file) } : a;
    }),
  };
  await Preferences.set({ key: SAVED, value: JSON.stringify(withFiles) });
}

/** The last set saved, for when there is no connection. */
export async function savedSet(): Promise<DailySet | null> {
  if (!inApp) return null;
  try {
    const { value } = await Preferences.get({ key: SAVED });
    return value ? (JSON.parse(value) as DailySet) : null;
  } catch {
    return null;
  }
}
