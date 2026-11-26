import snoopIcon from "./icons/dancer-snoop-32.png";
import snoopTouchIcon from "./icons/dancer-snoop-180.png";
import zepIcon from "./icons/dancer-zep-32.png";
import zepTouchIcon from "./icons/dancer-zep-180.png";
import chadIcon from "./icons/dancer-chad-32.png";
import chadTouchIcon from "./icons/dancer-chad-180.png";
import milanIcon from "./icons/dancer-milan-32.png";
import milanTouchIcon from "./icons/dancer-milan-180.png";
import satinIcon from "./icons/dancer-satin-32.png";
import satinTouchIcon from "./icons/dancer-satin-180.png";
import afroIcon from "./icons/dancer-afro-32.png";
import afroTouchIcon from "./icons/dancer-afro-180.png";
import leatherIcon from "./icons/dancer-leather-32.png";
import leatherTouchIcon from "./icons/dancer-leather-180.png";
import studsIcon from "./icons/dancer-studs-32.png";
import studsTouchIcon from "./icons/dancer-studs-180.png";
import balaclavaIcon from "./icons/dancer-balaclava-32.png";
import balaclavaTouchIcon from "./icons/dancer-balaclava-180.png";
import cargoIcon from "./icons/dancer-cargo-32.png";
import cargoTouchIcon from "./icons/dancer-cargo-180.png";

// The dancers the opening screen picks from, one at random per visit.
//
// - snoop: the Android app's original dance (res/raw/snoop_dance.json).
// - zep: traced from a Zep dance clip in the same style — flat shapes per body
//   part, ~10 key poses a second morphed at 60 fps — so they all sit together.
// - chad: traced the same way from a dance clip, drawn as the dancer is.
// - milan: another routine by the same dancer, dressed in a striped football
//   jersey and baggy trousers.
// - satin: traced from another clip, drawn as the dancer is: red satin shirt
//   open at the collar, red trousers, sunglasses and a grey beard.
// - afro, leather, studs, balaclava, cargo: five routines by one dancer.
//   afro is drawn as she is (afro, brown tube top, denim mini skirt, heels);
//   the other four keep her moves in other outfits: a black leather tube top
//   and maroon cargo trousers; a white studded two-piece, lace-up boots and a
//   ponytail; a white balaclava, blue tee and shorts; a green work jacket,
//   cargo trousers and locs.
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
  { id: "satin", load: () => import("./satin-dance.json"), icon: satinIcon, touchIcon: satinTouchIcon },
  { id: "afro", load: () => import("./afro-dance.json"), icon: afroIcon, touchIcon: afroTouchIcon },
  { id: "leather", load: () => import("./leather-dance.json"), icon: leatherIcon, touchIcon: leatherTouchIcon },
  { id: "studs", load: () => import("./studs-dance.json"), icon: studsIcon, touchIcon: studsTouchIcon },
  { id: "balaclava", load: () => import("./balaclava-dance.json"), icon: balaclavaIcon, touchIcon: balaclavaTouchIcon },
  { id: "cargo", load: () => import("./cargo-dance.json"), icon: cargoIcon, touchIcon: cargoTouchIcon },
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
