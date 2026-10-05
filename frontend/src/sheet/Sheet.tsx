import { useCallback, useEffect, useRef, useState } from "react";
import type { Artwork } from "../api";

// The native app's bottom sheet (rlBottomSheet in activity_main.xml): peeks at
// a fifth of the screen with the arrow, title and artist, and drags up to fill
// the screen with the description and the "Read more" link. Same colours as
// the page behind it. The arrow is the app's own animation (res/raw/arrow.json):
// its first half turns it to point up, its second half back down.

const ARROW_UP: [number, number] = [0, 7];
const ARROW_DOWN: [number, number] = [7, 14];
const SNAP_MS = 250;

interface Player {
  playSegments(s: [number, number], force: boolean): void;
  destroy(): void;
}

function usePeek(): number {
  const [peek, setPeek] = useState(() => Math.round(window.innerHeight / 5));
  useEffect(() => {
    const onResize = () => setPeek(Math.round(window.innerHeight / 5));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return peek;
}

export function Sheet({ artwork }: { artwork: Artwork }) {
  const peek = usePeek();
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState<number | null>(null); // translateY while dragging
  const start = useRef<{ y: number; from: number; t: number; moved: boolean } | null>(null);
  const arrowBox = useRef<HTMLDivElement>(null);
  const arrow = useRef<Player | null>(null);

  const closedY = () => window.innerHeight - peek;

  useEffect(() => {
    const box = arrowBox.current;
    if (!box) return;
    let cancelled = false;
    Promise.all([import("lottie-web/build/player/lottie_light"), import("./arrow.json")])
      .then(([{ default: lottie }, { default: data }]) => {
        if (cancelled) return;
        const a = lottie.loadAnimation({ container: box, renderer: "svg", loop: false, autoplay: false, animationData: data });
        a.playSegments(ARROW_UP, true);
        arrow.current = a;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      arrow.current?.destroy();
    };
  }, []);

  const setOpenAndArrow = useCallback(
    (next: boolean) => {
      if (next !== open) arrow.current?.playSegments(next ? ARROW_DOWN : ARROW_UP, true);
      setOpen(next);
    },
    [open],
  );

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, from: open ? 0 : closedY(), t: performance.now(), moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dy = e.clientY - s.y;
    if (Math.abs(dy) > 6) s.moved = true;
    if (s.moved) setDrag(Math.min(closedY(), Math.max(0, s.from + dy)));
  };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    if (!s.moved) {
      setOpenAndArrow(!open); // a tap toggles
      setDrag(null);
      return;
    }
    const y = Math.min(closedY(), Math.max(0, s.from + (e.clientY - s.y)));
    const v = (e.clientY - s.y) / Math.max(1, performance.now() - s.t); // px per ms
    const next = Math.abs(v) > 0.5 ? v < 0 : y < closedY() / 2;
    setOpenAndArrow(next);
    setDrag(null);
  };

  const y = drag ?? (open ? 0 : closedY());
  const description = [artwork.description, artwork.creditLine ? `Credit: ${artwork.creditLine}` : null]
    .filter(Boolean)
    .join("\n\n");

  return (
    <section
      className={drag === null ? "sheet" : "sheet dragging"}
      style={{ transform: `translateY(${y}px)`, transitionDuration: drag === null ? `${SNAP_MS}ms` : "0ms" }}
      aria-label="About this artwork"
    >
      <button
        className="sheet-head"
        // The head fills the peek, so the collapsed sheet shows only the
        // arrow, title and artist; the description starts below the fold.
        style={{ minHeight: peek }}
        aria-expanded={open}
        aria-label={open ? "Hide the details" : "Show the details"}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          start.current = null;
          setDrag(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpenAndArrow(!open);
          }
        }}
      >
        <span className="sheet-arrow" ref={arrowBox} aria-hidden="true" />
        <span className="sheet-title">{artwork.title}</span>
        <span className="sheet-artist">{artwork.artist ?? ""}</span>
      </button>
      <div className="sheet-body" aria-hidden={!open}>
        <p className="sheet-description">{description}</p>
      </div>
      <footer className="sheet-foot" aria-hidden={!open}>
        <a href={artwork.link} target="_blank" rel="noopener noreferrer" tabIndex={open ? 0 : -1}>
          Read more on <u>NGA.gov</u>
        </a>
        <span className="sheet-credit">
          Courtesy National Gallery of Art, Washington · open access (CC0). Atapp is not affiliated with or endorsed by the
          National Gallery of Art.
        </span>
      </footer>
    </section>
  );
}
