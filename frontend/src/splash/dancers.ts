import snoopIcon from "./icons/dancer-snoop-32.png";
import snoopTouchIcon from "./icons/dancer-snoop-180.png";
import zepIcon from "./icons/dancer-zep-32.png";
import zepTouchIcon from "./icons/dancer-zep-180.png";
import chadIcon from "./icons/dancer-chad-32.png";
import chadTouchIcon from "./icons/dancer-chad-180.png";
import milanIcon from "./icons/dancer-milan-32.png";
import milanTouchIcon from "./icons/dancer-milan-180.png";

// The dancers the opening screen picks from, one at random per visit.
//
// - snoop: the Android app's original dance (res/raw/snoop_dance.json).
// - zep: traced from a Zep dance clip in the same style — flat shapes per body
//   part, ~10 key poses a second morphed at 60 fps — so they all sit together.
// - chad: traced the same way from a dance clip, drawn as the dancer is.
// - milan: another routine by the same dancer, dressed in a striped football
//   jersey and baggy trousers.
//
// Each animation loads in its own chunk, only when picked. `icon` is its face
// at browser-tab size and `touchIcon` at home-screen size: the tab shows whoever
// is dancing, and someone who adds the site to their home screen gets that
// dancer's face as the app icon.

export interface Dancer {
  id: string;
  load: () => Promise<{ default: unknown }>;
  icon: string;
  touchIcon: string;
}

export const DANCERS: Dancer[] = [
  { id: "snoop", load: () => import("./snoop-dance.json"), icon: snoopIcon, touchIcon: snoopTouchIcon },
  { id: "zep", load: () => import("./zep-dance.json"), icon: zepIcon, touchIcon: zepTouchIcon },
  { id: "chad", load: () => import("./chad-dance.json"), icon: chadIcon, touchIcon: chadTouchIcon },
  { id: "milan", load: () => import("./milan-dance.json"), icon: milanIcon, touchIcon: milanTouchIcon },
];

export function pickDancer(random: () => number = Math.random): Dancer {
  return DANCERS[Math.min(DANCERS.length - 1, Math.floor(random() * DANCERS.length))];
}

/** Show this dancer's face as the page's icons. */
export function showDancerIcon(dancer: Dancer, doc: Document = document): void {
  for (const [rel, href] of [["icon", dancer.icon], ["apple-touch-icon", dancer.touchIcon]] as const) {
    let link = doc.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!link) {
      link = doc.createElement("link");
      link.rel = rel;
      doc.head.appendChild(link);
    }
    link.href = href;
  }
}
