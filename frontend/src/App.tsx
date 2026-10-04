import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRecent, type Artwork, type Day } from "./api";
import { themeFor } from "./colours";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; days: Day[] };

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

/** "Today", "Yesterday", or e.g. "Thu 1 Oct". Dates are UTC days, as the backend's. */
function dayLabel(date: string, today: string): string {
  const ms = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`);
  const ago = Math.round(ms / 86_400_000);
  if (ago === 0) return "Today";
  if (ago === 1) return "Yesterday";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function applyTheme(artwork: Artwork | null, dark: boolean) {
  const t = themeFor(artwork?.colours ?? null, dark);
  const root = document.documentElement.style;
  root.setProperty("--bg", t.background);
  root.setProperty("--text", t.text);
  root.setProperty("--subtle", t.subtle);
  root.setProperty("--accent", t.accent);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t.background);
}

export function App() {
  const [state, setState] = useState<State>({ status: "loading" });
  const dark = useDarkMode();
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState<Artwork | null>(null);

  const load = useCallback(() => {
    const ctrl = new AbortController();
    setState({ status: "loading" });
    fetchRecent(10, ctrl.signal)
      // Oldest first, so today is the right-most slide and swiping right goes back in time.
      .then((days) => {
        setActive(days.length - 1);
        setState({ status: "ready", days: [...days].reverse() });
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          console.error(err);
          setState({ status: "error" });
        }
      });
    return () => ctrl.abort();
  }, []);

  useEffect(() => load(), [load]);

  const days = state.status === "ready" ? state.days : [];
  const current = days[active]?.artwork ?? null;
  useEffect(() => applyTheme(current, dark), [current, dark]);

  if (state.status === "loading") {
    return (
      <div className="message" aria-busy="true">
        <p className="wordmark">Atapp</p>
        <p className="muted">Fetching today’s artwork…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="message" role="alert">
        <p className="wordmark">Atapp</p>
        <p>Couldn’t reach the gallery just now.</p>
        <button className="button" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="message">
        <p className="wordmark">Atapp</p>
        <p>The collection hasn’t been loaded yet. Check back soon.</p>
        <Credit />
      </div>
    );
  }

  const today = days[days.length - 1].date;
  return (
    <>
      <Pager days={days} today={today} active={active} onActive={setActive} onZoom={setZoomed} />
      {zoomed && <Zoom artwork={zoomed} onClose={() => setZoomed(null)} />}
    </>
  );
}

function Pager(props: {
  days: Day[];
  today: string;
  active: number;
  onActive: (i: number) => void;
  onZoom: (a: Artwork) => void;
}) {
  const { days, today, active, onActive, onZoom } = props;
  const ref = useRef<HTMLDivElement>(null);

  // Start on today.
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            onActive(Number((e.target as HTMLElement).dataset.index));
          }
        }
      },
      { root: el, threshold: 0.6 },
    );
    el.querySelectorAll(".slide").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [days, onActive]);

  const go = (delta: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: delta * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="app">
      <header className="top">
        <span className="wordmark">Atapp</span>
        <span className="day" aria-live="polite">
          {dayLabel(days[active].date, today)}
        </span>
      </header>

      <div
        className="pager"
        ref={ref}
        tabIndex={0}
        aria-label="Artworks by day. Swipe or use the arrow keys."
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
      >
        {days.map((d, i) => (
          <Slide key={d.date} index={i} day={d} label={dayLabel(d.date, today)} onZoom={onZoom} />
        ))}
      </div>

      {days.length > 1 && (
        <nav className="dots" aria-label="Choose a day">
          <button className="arrow" onClick={() => go(-1)} disabled={active === 0} aria-label="Previous day">
            ‹
          </button>
          {days.map((d, i) => (
            <span key={d.date} className={i === active ? "dot on" : "dot"} />
          ))}
          <button
            className="arrow"
            onClick={() => go(1)}
            disabled={active === days.length - 1}
            aria-label="Next day"
          >
            ›
          </button>
        </nav>
      )}
      <footer className="courtesy">
        Courtesy{" "}
        <a href="https://www.nga.gov/" target="_blank" rel="noopener noreferrer">
          National Gallery of Art, Washington
        </a>{" "}
        · open access (CC0)
      </footer>
    </div>
  );
}

function srcSet(a: Artwork): string {
  return a.image.sizes.map((s) => `${s.url} ${s.width}w`).join(", ");
}

function Slide(props: { index: number; day: Day; label: string; onZoom: (a: Artwork) => void }) {
  const { index, day, label, onZoom } = props;
  const a = day.artwork;
  const [open, setOpen] = useState(false);
  const fallback = a.image.sizes[Math.min(1, a.image.sizes.length - 1)].url;

  return (
    <article className="slide" data-index={index} aria-label={`${label}: ${a.title}`}>
      <button className="frame" onClick={() => onZoom(a)} aria-label={`View ${a.title} larger`}>
        <img
          src={fallback}
          srcSet={srcSet(a)}
          sizes="(min-width: 900px) 60vw, 100vw"
          alt={a.image.alt}
          width={a.image.width ?? undefined}
          height={a.image.height ?? undefined}
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
        />
      </button>

      <section className={open ? "sheet open" : "sheet"}>
        <button className="sheet-head" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="title">{a.title}</span>
          <span className="artist">
            {[a.artist, a.date].filter(Boolean).join(" · ") || "Artist unknown"}
          </span>
          <span className="chevron" aria-hidden="true" />
        </button>
        {open && (
          <div className="sheet-body">
            <dl>
              {a.medium && (
                <>
                  <dt>Medium</dt>
                  <dd>{a.medium}</dd>
                </>
              )}
              {a.dimensions && (
                <>
                  <dt>Dimensions</dt>
                  <dd className="pre">{a.dimensions}</dd>
                </>
              )}
              {a.creditLine && (
                <>
                  <dt>Credit</dt>
                  <dd>{a.creditLine}</dd>
                </>
              )}
            </dl>
            {a.description && (
              <>
                <h2>What’s in the picture</h2>
                <p>{a.description}</p>
              </>
            )}
            <a className="button" href={a.link} target="_blank" rel="noopener noreferrer">
              See it at the National Gallery of Art
            </a>
            <Credit />
          </div>
        )}
      </section>
    </article>
  );
}

function Zoom({ artwork, onClose }: { artwork: Artwork; onClose: () => void }) {
  const largest = artwork.image.sizes[artwork.image.sizes.length - 1].url;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="zoom" role="dialog" aria-modal="true" aria-label={artwork.title}>
      <button className="zoom-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <img src={largest} alt={artwork.image.alt} />
    </div>
  );
}

// The National Gallery's open data and images are CC0, so credit is not
// required — but it is right. Their logo is not used, and nothing here may
// suggest they endorse this app.
function Credit() {
  return (
    <p className="credit">
      Artwork images and data courtesy of the{" "}
      <a href="https://www.nga.gov/" target="_blank" rel="noopener noreferrer">
        National Gallery of Art, Washington
      </a>
      , released through its{" "}
      <a href="https://github.com/NationalGalleryOfArt/opendata" target="_blank" rel="noopener noreferrer">
        open data program
      </a>{" "}
      under CC0. Atapp is an independent project and is not affiliated with or endorsed by the National
      Gallery of Art.
    </p>
  );
}
