"""Write the Android app's launcher icons, one per dancer.

    python tools/android/launcher_icons.py

Reads tools/android/launcher/<dancer>.png (512px head-and-shoulders crops, cut
by tools/dancers/icon.py; snoop's is the website's icon-512.png) and writes,
under frontend/android/app/src/main/res:

  mipmap-<density>/ic_launcher_<dancer>.png      legacy square icon (Android 7)
  mipmap-<density>/ic_launcher_<dancer>_fg.png   adaptive icon foreground
  mipmap-anydpi-v26/ic_launcher_<dancer>.xml     adaptive icon (Android 8+)

The adaptive foreground is the crop scaled so the head fills the launcher's
mask (it shows the middle 72 of 108 dp) without touching its edge, anchored at
the bottom with the shoulders carried to the edges, on the splash card's yellow.
Needs opencv-python-headless and numpy.
"""
import pathlib
import cv2

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / "tools/android/launcher"
RES = ROOT / "frontend/android/app/src/main/res"
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
FG_SHARE = 0.8  # the crop's width as a share of the 108 dp canvas

ADAPTIVE = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_{id}_fg" />
</adaptive-icon>
"""


def foreground(img, size):
    inner = round(size * FG_SHARE)
    crop = cv2.resize(img, (inner, inner), interpolation=cv2.INTER_AREA)
    side = (size - inner) // 2
    # The top and sides are the card's yellow already; carry the bottom row's
    # shoulders out to the edges and keep the figure on the bottom edge.
    return cv2.copyMakeBorder(crop, size - inner, 0, side, size - inner - side, cv2.BORDER_REPLICATE)


def main():
    (RES / "mipmap-anydpi-v26").mkdir(parents=True, exist_ok=True)
    for path in sorted(SRC.glob("*.png")):
        img = cv2.imread(str(path))
        dancer = path.stem
        for name, scale in DENSITIES.items():
            out = RES / f"mipmap-{name}"
            out.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(out / f"ic_launcher_{dancer}_fg.png"), foreground(img, round(108 * scale)))
            legacy = round(48 * scale)
            cv2.imwrite(str(out / f"ic_launcher_{dancer}.png"), cv2.resize(img, (legacy, legacy), interpolation=cv2.INTER_AREA))
        (RES / "mipmap-anydpi-v26" / f"ic_launcher_{dancer}.xml").write_text(ADAPTIVE.format(id=dancer))
        print(dancer)


if __name__ == "__main__":
    main()
