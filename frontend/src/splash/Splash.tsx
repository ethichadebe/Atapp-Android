import { useEffect, useRef, useState } from "react";
import { pickDancer, showDancerIcon } from "./dancers";
import logoBlack from "./logo-black.png";
import logoWhite from "./logo-white.png";

// The Android app's opening screen (SplashScreenActivity and
// res/layout/activity_splash_screen.xml): a pale card shrinking from twice its
// size while everything on it holds still, "ATAPP" stacked down its left in Lilita One, a dancer beside it (picked
// at random each visit, see dancers.ts), and the logo at the foot of the screen.
//
// It stays until the card has settled, the dance has played once *and* the
// day's artwork has arrived, as the Android one stayed until its scrape
// finished. A tap skips it.

const LETTERS = ["A", "T", "A", "P", "P"];
const FADE_MS = 400;
const CARD_W = 300;
const CARD_H = 360;
// The card's shrink (styles.css). The native screen stayed at least this long:
// it moved on only once the card had settled and the art was ready.
const SHRINK_MS = 3000;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Splash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [dancer] = useState(() => pickDancer());
  const [danced, setDanced] = useState(false);
  const [settled, setSettled] = useState(false);
  // 200%p: twice the screen, in each direction, relative to the card.
  const [zoom] = useState(() => ({
    "--zoom-x": String((2 * window.innerWidth) / CARD_W),
    "--zoom-y": String((2 * window.innerHeight) / CARD_H),
  }));

  useEffect(() => {
    const t = window.setTimeout(() => setSettled(true), prefersReducedMotion() ? 0 : SHRINK_MS);
    return () => window.clearTimeout(t);
  }, []);

  // The tab (and, for anyone adding the site to their home screen, the app
  // icon) shows the face of whoever is dancing.
  useEffect(() => showDancerIcon(dancer), [dancer]);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const container = stage.current;
    if (!container) return;
    const still = prefersReducedMotion();
    let anim: { destroy(): void } | undefined;
    let cancelled = false;

    // Loaded on the side, in parallel with the day's artwork, so the player and
    // the dance (50 to 100 KB gzipped together) never hold up the page itself.
    // The light build has the SVG renderer only and no expression support, so
    // no eval(): the page's content security policy stays as strict as it is.
    Promise.all([import("lottie-web/build/player/lottie_light"), dancer.load()])
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
          // No dancing for people who asked for less motion: show the
          // dancer standing, and do not hold them on this screen.
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
  }, [dancer]);

  useEffect(() => {
    if (!leaving && danced && settled && ready) setLeaving(true);
  }, [danced, settled, ready, leaving]);

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
      {/* Only the card shrinks; the letters and the dancer hold still over it. */}
      <div className="splash-card" style={zoom as React.CSSProperties} aria-hidden="true" />
      <div className="splash-content">
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
