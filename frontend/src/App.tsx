import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDaily, type Artwork } from "./api";
import { randomTheme, themeFor } from "./colours";
import { Splash } from "./splash/Splash";
import { Sheet } from "./sheet/Sheet";

// The main screen, as the Android app's MainActivity drew it
// (res/layout/activity_main.xml), reproduced from its screen recording:
//
//   - today's 10 artworks in a full-screen horizontal pager, one per page,
//     each centred with a 10 px margin; pages squash vertically to 86% as they
//     slide (its CompositePageTransformer) with a 40 px gap between them;
//   - a slider at the top: a translucent pill of 8 px slots, one per artwork,
//     with an 8 px dot in the text colour that stretches as you swipe
//     (TabLayout, tabIndicatorAnimationMode="elastic");
//   - the page background crossfading over 1 s to each artwork's colours
//     (its TransitionDrawable): two that contrast, picked at random from the
//     artwork's main colours every time a page is shown;
//   - a bottom sheet with the title and artist, dragged up for the rest.
//
// Nothing else: no header, no labels. Text is all Lilita One.

type State = { status: "loading" } | { status: "error" } | { status: "ready"; artworks: Artwork[] };

const GAP = 40; // MarginPageTransformer(40)
const SLOT = 8; // tabMinWidth / tabMaxWidth: 8dp

function useDarkMode(): boolean {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return dark;
}

function applyTheme(artwork: Artwork | null, dark: boolean) {
  const t = artwork ? randomTheme(artwork.colours, dark) : themeFor(null, dark);
  const root = document.documentElement.style;
  root.setProperty("--bg", t.background);
  root.setProperty("--text", t.text);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t.background);
}

export function App() {
  const [splash, setSplash] = useState(true);
  const [ready, setReady] = useState(false);
  const hideSplash = useCallback(() => setSplash(false), []);
  const settled = useCallback(() => setReady(true), []);
  return (
    <>
      <Content onSettled={settled} />
      {splash && <Splash ready={ready} onDone={hideSplash} />}
    </>
  );
}

function Content({ onSettled }: { onSettled: () => void }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const dark = useDarkMode();

  const load = useCallback(() => {
    const ctrl = new AbortController();
    setState({ status: "loading" });
    fetchDaily(ctrl.signal)
      .then((d) => setState({ status: "ready", artworks: d.artworks }))
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          console.error(err);
          setState({ status: "error" });
        }
      });
    return () => ctrl.abort();
  }, []);

  useEffect(() => load(), [load]);

  // Tells the opening screen it may go: there is something to show.
  useEffect(() => {
    if (state.status !== "loading") onSettled();
  }, [state.status, onSettled]);

  useEffect(() => {
    if (state.status !== "ready") applyTheme(null, dark);
  }, [state.status, dark]);

  if (state.status === "error") {
    return (
      <div className="message" role="alert">
        <p>Connection error...</p>
        <button className="retry" onClick={load}>
          Retry
        </button>
      </div>
    );
  }
  if (state.status === "loading") {
    return <div className="message" aria-busy="true" />;
  }
  if (state.artworks.length === 0) {
    return (
      <div className="message">
        <p>Looking for some art...</p>
      </div>
    );
  }
  return <Gallery artworks={state.artworks} dark={dark} />;
}

function Gallery({ artworks, dark }: { artworks: Artwork[]; dark: boolean }) {
  const pager = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0); // 0 .. n-1, fractional while swiping
  const active = Math.min(artworks.length - 1, Math.max(0, Math.round(progress)));

  // The background (and the text) follow the page you're on, with a fresh
  // random pair each time you land on it; the CSS transition on --bg is the
  // native 1 s crossfade.
  useEffect(() => applyTheme(artworks[active], dark), [artworks, active, dark]);

  const onScroll = useCallback(() => {
    const el = pager.current;
    if (el) setProgress(el.scrollLeft / (el.clientWidth + GAP));
  }, []);

  useEffect(() => {
    const el = pager.current;
    if (!el) return;
    const go = (d: number) => el.scrollBy({ left: d * (el.clientWidth + GAP), behavior: "smooth" });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="gallery">
      <Indicator count={artworks.length} progress={progress} />
      <div className="pager" ref={pager} onScroll={onScroll} aria-label="Today's artworks. Swipe for the next.">
        {artworks.map((a, i) => {
          // The native page transformer: a page squashes to 86% height as it
          // slides away from the centre.
          const r = 1 - Math.min(1, Math.abs(progress - i));
          return <Page key={a.objectId} artwork={a} scaleY={0.86 + r * 0.14} eager={i < 2} />;
        })}
      </div>
      <Sheet artwork={artworks[active]} />
    </div>
  );
}

/**
 * The slider at the top. The dot is one 8 px slot wide at rest; mid-swipe its
 * leading edge runs ahead and the trailing edge catches up, as the native
 * elastic indicator did.
 */
function Indicator({ count, progress }: { count: number; progress: number }) {
  const p = Math.min(count - 1, Math.max(0, progress));
  const i = Math.floor(p);
  const f = p - i;
  const lead = Math.min(1, f * 2);
  const trail = Math.max(0, f * 2 - 1);
  const left = (i + trail) * SLOT;
  const right = (i + 1 + lead) * SLOT;
  return (
    <div
      className="indicator"
      style={{ width: count * SLOT }}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={Math.round(p) + 1}
      aria-label={`Artwork ${Math.round(p) + 1} of ${count}`}
    >
      <span className="indicator-dot" style={{ left, width: Math.min(right, count * SLOT) - left }} />
    </div>
  );
}

function Page({ artwork, scaleY, eager }: { artwork: Artwork; scaleY: number; eager: boolean }) {
  const a = artwork;
  return (
    <section className="page" style={{ transform: `scaleY(${scaleY})` }} aria-label={a.title}>
      <PinchImage
        src={a.image.sizes[Math.min(1, a.image.sizes.length - 1)].url}
        srcSet={a.image.sizes.map((s) => `${s.url} ${s.width}w`).join(", ")}
        alt={a.image.alt}
        width={a.image.width ?? undefined}
        height={a.image.height ?? undefined}
        eager={eager}
      />
    </section>
  );
}

/**
 * Pinch to zoom, then let go and it springs back — what the native app's
 * Zoomy library did. One finger still swipes between pages.
 */
function PinchImage(props: { src: string; srcSet: string; alt: string; width?: number; height?: number; eager: boolean }) {
  const img = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ d: number; mx: number; my: number } | null>(null);
  const [zoom, setZoom] = useState<{ s: number; x: number; y: number } | null>(null);

  const mid = () => {
    const pts = [...pointers.current.values()];
    return {
      d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
      mx: (pts[0].x + pts[1].x) / 2,
      my: (pts[0].y + pts[1].y) / 2,
    };
  };
  const release = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      start.current = null;
      setZoom(null);
    }
  };

  return (
    <img
      ref={img}
      className={zoom ? "art zooming" : "art"}
      src={props.src}
      srcSet={props.srcSet}
      sizes="100vw"
      alt={props.alt}
      width={props.width}
      height={props.height}
      loading={props.eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      style={zoom ? { transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})` } : undefined}
      onPointerDown={(e) => {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2) start.current = mid();
      }}
      onPointerMove={(e) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2 && start.current) {
          const m = mid();
          setZoom({ s: Math.max(1, m.d / start.current.d), x: m.mx - start.current.mx, y: m.my - start.current.my });
        }
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
    />
  );
}
