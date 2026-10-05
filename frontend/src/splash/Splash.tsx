import { useEffect, useRef, useState } from "react";
import logoBlack from "./logo-black.png";
import logoWhite from "./logo-white.png";

// The Android app's opening screen (SplashScreenActivity and
// res/layout/activity_splash_screen.xml): a pale card zooming in from twice its
// size, "ATAPP" stacked down its left in Lilita One, the dancing figure
// (res/raw/snoop_dance.json) beside it, and the logo at the foot of the screen.
//
// It stays until the dance has played once *and* the day's artwork has
// arrived, as the Android one stayed until its scrape finished. A tap skips it.

const LETTERS = ["A", "T", "A", "P", "P"];
const FADE_MS = 400;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Splash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [danced, setDanced] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const container = stage.current;
    if (!container) return;
    const still = prefersReducedMotion();
    let anim: { destroy(): void } | undefined;
    let cancelled = false;

    // Loaded on the side, in parallel with the day's artwork, so the player and
    // the dance (about 70 KB gzipped together) never hold up the page itself.
    // The light build has the SVG renderer only and no expression support, so
    // no eval(): the page's content security policy stays as strict as it is.
    Promise.all([import("lottie-web/build/player/lottie_light"), import("./snoop-dance.json")])
      .then(([{ default: lottie }, { default: dance }]) => {
        if (cancelled) return;
        const a = lottie.loadAnimation({
          container,
          renderer: "svg",
          loop: false,
          autoplay: !still,
          animationData: dance,
          rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
        });
        anim = a;
        if (still) {
          // No dancing for people who asked for less motion: show him
          // standing, and do not hold them on this screen.
          a.goToAndStop(0, true);
          setDanced(true);
        } else {
          a.addEventListener("complete", () => setDanced(true));
        }
      })
      // No dancer is no reason to keep anyone from today's artwork.
      .catch(() => setDanced(true));

    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!leaving && danced && ready) setLeaving(true);
  }, [danced, ready, leaving]);

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(onDone, prefersReducedMotion() ? 0 : FADE_MS);
    return () => window.clearTimeout(t);
  }, [leaving, onDone]);

  return (
    <div
      className={leaving ? "splash leaving" : "splash"}
      role="status"
      aria-label="Atapp is loading"
      onClick={() => ready && setLeaving(true)}
    >
      <div className="splash-card">
        <div className="splash-letters" aria-hidden="true">
          {LETTERS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="splash-dancer" ref={stage} aria-hidden="true" />
      </div>
      <picture className="splash-logo">
        <source srcSet={logoWhite} media="(prefers-color-scheme: dark)" />
        <img src={logoBlack} alt="" width={28} height={28} />
      </picture>
    </div>
  );
}
