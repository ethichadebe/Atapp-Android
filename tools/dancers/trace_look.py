"""Trace a dancer from video into a Lottie in the original Atapp dance's style,
optionally dressed in a different look.

Flat-colour shapes per body part, each redrawn at ~10 key poses a second and
morphed between them at 60 fps, in a 500x800 frame — the way the original
Android dance and the zep dancer are built.

    trace_look.py LOOK VIDEO POSE.json OUT.json [FIRST LAST]

LOOK is one of the entries in LOOKS below. Without FIRST/LAST the liveliest
3 seconds are picked. Run from a folder holding multiclass.tflite
(selfie_multiclass_256x256.tflite).
"""
import json, sys
import cv2, numpy as np, mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
from scipy.signal import savgol_filter

LOOK, VIDEO, POSE, OUT = sys.argv[1:5]
STEP, OUT_FPS, W, H, CLIP = 3, 60, 500, 800, 90
INK = "#14132a"

# ── Looks ───────────────────────────────────────────────────────────────────
# Each look lists its layers top-first: name -> (fill, outline width, points).
LOOKS = {
    # The dancer in the clips, as he is: white tee, periwinkle shorts, sneakers.
    "chad": {
        "hair": "raw",
        "layers": {
            "sleeveL": ("#f6f5f1", 4, 22), "sleeveR": ("#f6f5f1", 4, 22),
            "armL": ("#c98f66", 4, 26), "armR": ("#c98f66", 4, 26),
            "hair": ("#1b1a20", 0, 26), "face": ("#c98f66", 5, 22),
            "top": ("#f6f5f1", 4, 34),
            "bottomL": ("#8b8ff0", 4, 24), "bottomR": ("#8b8ff0", 4, 24),
            "legL": ("#c98f66", 4, 26), "legR": ("#c98f66", 4, 26),
            "shoeL": ("#e9edf0", 4, 16), "shoeR": ("#e9edf0", 4, 16),
        },
    },
    # Red-and-black striped football jersey, baggy black trousers, silver sneakers.
    "milan": {
        "hair": "raw", "stripes": 4, "baggy": True,
        "layers": {
            "sleeveL": ("#cf2630", 0, 22), "sleeveR": ("#cf2630", 0, 22),
            "armL": ("#5e3b2c", 4, 26), "armR": ("#5e3b2c", 4, 26),
            "hair": ("#121012", 0, 26), "face": ("#5e3b2c", 5, 22),
            "stripe0": ("#141216", 0, 16), "stripe1": ("#141216", 0, 16),
            "stripe2": ("#141216", 0, 16), "stripe3": ("#141216", 0, 16),
            "top": ("#cf2630", 0, 34),
            "bottomL": ("#17151b", 0, 30), "bottomR": ("#17151b", 0, 30),
            "shoeL": ("#c9ccd3", 4, 16), "shoeR": ("#c9ccd3", 4, 16),
        },
    },
}
look = LOOKS[LOOK]
LAYERS = look["layers"]

d = json.load(open(POSE))
fps = d["fps"]
raw = [np.array(f)[:, :2] if f is not None else None for f in d["frames"]]
for i in range(len(raw)):
    if raw[i] is None:
        raw[i] = raw[i - 1]
POSEP = savgol_filter(np.stack(raw), 7, 2, axis=0)
n_frames = len(POSEP)

if len(sys.argv) > 6:
    FIRST, LAST = int(sys.argv[5]), int(sys.argv[6])
else:  # the liveliest 3 seconds
    move = np.linalg.norm(np.diff(POSEP[:, [13, 14, 15, 16, 25, 26, 27, 28]], axis=0), axis=2).sum(1)
    starts = range(0, max(1, n_frames - CLIP))
    FIRST = max(starts, key=lambda s: move[s:s + CLIP].sum())
    LAST = min(n_frames - 1, FIRST + CLIP)

seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
    base_options=BaseOptions(model_asset_path="multiclass.tflite"), output_category_mask=True))


def seg_dist(px, a, b):
    ab = b - a
    t = np.clip(((px - a) @ ab) / max(ab @ ab, 1e-6), 0, 1)
    return np.linalg.norm(px - (a + t[:, None] * ab), axis=1)


def poly_dist(px, pts):
    return np.min([seg_dist(px, pts[k], pts[k + 1]) for k in range(len(pts) - 1)], axis=0)


def soften(m, k=7):
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((k, k), np.uint8))
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((k // 2 + 1, k // 2 + 1), np.uint8))
    m = cv2.GaussianBlur(m, (0, 0), 1.5)
    return (m > 127).astype(np.uint8) * 255


def parts_for(img, P):
    """Generic body parts for one frame, then dressed in the look."""
    h, w = img.shape[:2]
    cls = np.squeeze(seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB))).category_mask.numpy_view())
    cls = cv2.medianBlur(cls.astype(np.uint8), 5)
    ys, xs = np.nonzero(cls > 0)
    px = np.stack([xs, ys], 1).astype(float)
    c = cls[ys, xs]
    # Picture-left limbs are the dancer's right (they face the camera).
    shL, shR, elL, elR, wrL, wrR = P[12], P[11], P[14], P[13], P[16], P[15]
    hpL, hpR, knL, knR, anL, anR = P[24], P[23], P[26], P[25], P[28], P[27]
    ftL, ftR = P[32], P[31]
    hip, sh = (hpL + hpR) / 2, (shL + shR) / 2
    torso_w = np.linalg.norm(shL - shR)
    along = (px - sh) @ (hip - sh) / max((hip - sh) @ (hip - sh), 1e-6)  # 0 shoulders, 1 hips
    side_r = ((px - hip) @ (hpR - hpL)) > 0
    d_arm = {"L": poly_dist(px, [shL, elL, wrL]), "R": poly_dist(px, [shR, elR, wrR])}
    d_leg = {"L": poly_dist(px, [hpL, knL, anL, ftL]), "R": poly_dist(px, [hpR, knR, anR, ftR])}
    d_torso = np.maximum(seg_dist(px, sh, hip) - torso_w * 0.45, 0)
    nearest = np.argmin(np.stack([d_arm["L"], d_arm["R"], d_torso, d_leg["L"], d_leg["R"]], 1), 1)
    is_arm, is_torso, is_leg = nearest <= 1, nearest == 2, nearest >= 3
    arm_side = np.where(nearest == 0, "L", "R")
    leg_side = np.where(nearest == 3, "L", np.where(nearest == 4, "R", np.where(side_r, "R", "L")))
    knee_y = (knL[1] + knR[1]) / 2
    near_foot = np.minimum(poly_dist(px, [anL, ftL]), poly_dist(px, [anR, ftR])) < torso_w * 0.35

    label = np.full(len(px), "", object)
    label[c == 1] = "hair"
    label[c == 3] = "face"
    skin = c == 2
    clothes = (c == 4) | (c == 5)
    # Shoes: below the knees, at a foot, and not skin.
    shoe = ~skin & (c != 1) & (c != 3) & near_foot & (px[:, 1] > knee_y)
    label[shoe] = np.where(np.linalg.norm(px[shoe] - ftL, axis=1) < np.linalg.norm(px[shoe] - ftR, axis=1), "shoeL", "shoeR")
    sk_arm = skin & is_arm
    label[sk_arm] = np.char.add("arm", arm_side[sk_arm].astype(str))
    sk_leg = skin & (is_leg | (along > 1.05))
    label[sk_leg] = np.char.add("leg", leg_side[sk_leg].astype(str))
    label[skin & is_torso & ~sk_leg] = "midriff"
    cl = clothes & ~shoe
    top = cl & ((is_torso & (along < 0.95)) | is_arm)
    # The torso core — everything between the shoulders and the hem, arms
    # crossing in front included — is shirt: the shirt is drawn complete and
    # the arms on top of it, instead of a shirt with bites where arms were.
    core = (d_torso == 0) & (along > 0.08) & (along < 0.92) & (c != 1) & (c != 3)
    label[top & is_arm] = np.char.add("sleeve", arm_side[top & is_arm].astype(str))
    label[top & ~is_arm] = "top"
    core_px = core & ~top
    bot = cl & ~top
    label[bot] = np.char.add("bottom", leg_side[bot].astype(str))

    base = {}
    core_m = np.zeros((h, w), np.uint8)
    core_m[ys[core], xs[core]] = 255
    for part in ["hair", "face", "top", "sleeveL", "sleeveR", "armL", "armR", "midriff",
                 "bottomL", "bottomR", "legL", "legR", "shoeL", "shoeR"]:
        m = np.zeros((h, w), np.uint8)
        sel = label == part
        m[ys[sel], xs[sel]] = 255
        if part == "top":
            m = cv2.bitwise_or(m, core_m)
        base[part] = soften(m)

    face_m = base["face"]
    fy, fx = np.nonzero(face_m)
    face_box = (fx.min(), fy.min(), fx.max(), fy.max()) if len(fx) else None
    up = (sh - hip) / max(np.linalg.norm(sh - hip), 1e-6)       # torso "up"
    right = np.array([-up[1], up[0]])
    if right @ (shR - shL) < 0:
        right = -right

    out = dict(base)
    # Hair
    if look["hair"] == "long" and face_box is not None:
        x0, y0, x1, y1 = face_box
        fw, fh = x1 - x0, y1 - y0
        cx = (x0 + x1) / 2
        drop = sh[1] + np.linalg.norm(sh - hip) * 0.3
        poly = np.array([[cx - fw * 0.75, y0 + fh * 0.1], [cx + fw * 0.75, y0 + fh * 0.1],
                         [cx + fw * 0.95, drop], [cx - fw * 0.95, drop]], np.int32)
        hm = cv2.bitwise_or(base["hair"], face_m)
        cv2.fillPoly(hm, [poly], 255)
        cs_, _ = cv2.findContours(hm, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        hull = cv2.convexHull(np.vstack([q[:, 0, :] for q in cs_]).astype(np.int32))
        out["hair"] = cv2.fillPoly(np.zeros_like(hm), [hull], 255)
    # Hat: a crown and a wide brim, sat on the head and tilted with it.
    if look.get("hat") and face_box is not None:
        x0, y0, x1, y1 = face_box
        fw, fh = x1 - x0, y1 - y0
        top_pt = np.array([(x0 + x1) / 2, y0 + fh * 0.12])
        tilt = np.degrees(np.arctan2(P[8][1] - P[7][1], P[8][0] - P[7][0]))
        if abs(tilt) > 90:
            tilt -= 180 * np.sign(tilt)
        hm = np.zeros((h, w), np.uint8)
        cv2.ellipse(hm, tuple(top_pt.astype(int)), (int(fw * 1.25), int(fw * 0.2)), tilt, 0, 360, 255, -1)
        crown = cv2.ellipse2Poly(tuple((top_pt - [0, fw * 0.32]).astype(int)), (int(fw * 0.62), int(fw * 0.45)), int(tilt), 180, 360, 10)
        cv2.fillPoly(hm, [np.vstack([crown, [top_pt + [fw * 0.62, 0]], [top_pt - [fw * 0.62, 0]]]).astype(np.int32)], 255)
        out["hat"] = hm
    # Crop top: the lowest part of the tee is bare midriff.
    if look.get("crop"):
        tee = base["top"]
        ty, tx = np.nonzero(tee)
        if len(tx):
            pts = np.stack([tx, ty], 1).astype(float)
            a2 = (pts - sh) @ (hip - sh) / max((hip - sh) @ (hip - sh), 1e-6)
            low = a2 > 0.8
            mid = np.zeros_like(tee)
            mid[ty[low], tx[low]] = 255
            # Only the bare strip under the tee, never wider than the tee itself.
            out["midriff"] = cv2.erode(soften(mid), np.ones((7, 7), np.uint8))
            keep = np.zeros_like(tee)
            keep[ty[~low], tx[~low]] = 255
            out["top"] = soften(keep)
    # A print on the chest, turned with the torso.
    if look.get("badge"):
        centre = sh + (hip - sh) * 0.3
        box = cv2.boxPoints(((float(centre[0]), float(centre[1])), (torso_w * 0.5, torso_w * 0.2),
                             float(np.degrees(np.arctan2(right[1], right[0])))))
        bm = cv2.fillPoly(np.zeros((h, w), np.uint8), [box.astype(np.int32)], 255)
        out["badge"] = cv2.bitwise_and(bm, out["top"])
    # Knee boots: everything below mid-shin on each leg, feet included.
    if look.get("boots"):
        for s, kn, an in (("L", knL, anL), ("R", knR, anR)):
            cut = kn + (an - kn) * 0.25
            leg = cv2.bitwise_or(base["leg" + s], base["shoe" + s])
            yy, xx = np.nonzero(leg)
            pts = np.stack([xx, yy], 1).astype(float)
            below = (pts - cut) @ (an - kn) > 0
            bm = np.zeros((h, w), np.uint8)
            bm[yy[below], xx[below]] = 255
            out["boot" + s] = cv2.dilate(soften(bm), np.ones((5, 5), np.uint8))
            lm = np.zeros((h, w), np.uint8)
            lm[yy[~below], xx[~below]] = 255
            out["leg" + s] = soften(lm)
    # Baggy trousers: shorts and bare leg together, down to the shoe, roomier.
    if look.get("baggy"):
        for s in "LR":
            m = cv2.bitwise_or(base["bottom" + s], base["leg" + s])
            m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
            out["bottom" + s] = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
    # Jersey stripes: bands running down the torso, clipped to the shirt.
    if look.get("stripes"):
        k = look["stripes"]
        yy, xx = np.nonzero(out["top"])
        pts = np.stack([xx, yy], 1).astype(float)
        u = (pts - sh) @ right / max(torso_w, 1e-6)  # -0.5 .. 0.5 across the chest
        for i in range(k):
            lo = -0.5 + (i + 0.5) / k - 0.07
            sel = (u > lo) & (u < lo + 0.14)
            m = np.zeros((h, w), np.uint8)
            m[yy[sel], xx[sel]] = 255
            out[f"stripe{i}"] = soften(m, 5)
    return out, cls


def outline(mask, n, anchor):
    """Largest outer contour, resampled to n points, starting nearest `anchor`, clockwise."""
    if mask is None:
        return None
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not cs:
        return None
    c = max(cs, key=cv2.contourArea)
    if cv2.contourArea(c) < 40:
        return None
    c = cv2.approxPolyDP(c[:, 0, :].astype(np.float32), 1.5, True)[:, 0, :].astype(float)
    if len(c) < 4:
        return None
    seg_len = np.linalg.norm(np.diff(np.vstack([c, c[:1]]), axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg_len)])
    t = np.linspace(0, s[-1], n, endpoint=False)
    pts = np.stack([np.interp(t, s, np.append(c[:, k], c[0, k])) for k in (0, 1)], 1)
    area = 0.5 * np.sum(pts[:, 0] * np.roll(pts[:, 1], -1) - np.roll(pts[:, 0], -1) * pts[:, 1])
    if area < 0:
        pts = pts[::-1]
    return np.roll(pts, -int(np.argmin(np.linalg.norm(pts - anchor, axis=1))), axis=0)


keys = list(range(FIRST, LAST + 1, STEP))
if keys[-1] != LAST:
    keys.append(LAST)
cap = cv2.VideoCapture(VIDEO)
frames, i = {}, 0
while True:
    ok, img = cap.read()
    if not ok or i > LAST:
        break
    if i in keys:
        frames[i] = img
    i += 1

ANCHOR_JOINT = {"armL": 12, "armR": 11, "sleeveL": 12, "sleeveR": 11, "legL": 24, "legR": 23,
                "bottomL": 24, "bottomR": 23, "shoeL": 28, "shoeR": 27, "bootL": 28, "bootR": 27}
traced = {p: [] for p in LAYERS}
heights, centres = [], []
for f in keys:
    P = POSEP[f]
    parts, cls = parts_for(frames[f], P)
    ys, xs = np.nonzero(cls > 0)
    heights.append(ys.max() - ys.min())
    centres.append([(P[23, 0] + P[24, 0]) / 2, ys.max()])
    for p, (_, _, npts) in LAYERS.items():
        anchor = P[ANCHOR_JOINT[p]] if p in ANCHOR_JOINT else P[0] + [0, -1000]
        traced[p].append(outline(parts.get(p), npts, anchor))

for p, seq in traced.items():
    for k in range(len(seq)):
        if seq[k] is None:
            prev = next((seq[j] for j in range(k - 1, -1, -1) if seq[j] is not None), None)
            nxt = next((seq[j] for j in range(k + 1, len(seq)) if seq[j] is not None), None)
            seq[k] = prev if prev is not None else nxt
    if all(x is None for x in seq):  # never visible: an empty dot
        seq[:] = [np.zeros((LAYERS[p][2], 2)) + POSEP[keys[k]][23] for k in range(len(seq))]
    for k in range(1, len(seq)):
        a, b = seq[k - 1], seq[k]
        shifts = [np.linalg.norm(np.roll(b, -s, 0) - a, axis=1).sum() for s in range(len(b))]
        seq[k] = np.roll(b, -int(np.argmin(shifts)), 0)

hs = savgol_filter(np.array(heights, float), min(9, len(heights) // 2 * 2 - 1), 1)
cs = np.array(centres, float)
scale = 700 / hs
cx = cs[:, 0]
offx = W / 2 + np.clip((cx - np.median(cx)) * scale * 0.5, -30, 30)
floor = 785
for p, seq in traced.items():
    arr = np.stack([np.stack([(s[:, 0] - cx[k]) * scale[k] + offx[k], (s[:, 1] - cs[k, 1]) * scale[k] + floor], 1)
                    for k, s in enumerate(seq)])
    if len(arr) >= 5:
        arr = savgol_filter(arr, 5, 2, axis=0)
    traced[p] = arr


def bezier(pts):
    t = (np.roll(pts, -1, 0) - np.roll(pts, 1, 0)) / 6
    return {"c": True, "v": pts.round().astype(int).tolist(), "i": (-t).round().astype(int).tolist(), "o": t.round().astype(int).tolist()}


def rgb(h):
    return [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)] + [1]


to_t = lambda f: round((f - FIRST) * OUT_FPS / fps)
op = to_t(LAST)
layers = []
for idx, (p, (fill, sw, _)) in enumerate(LAYERS.items()):
    ks = []
    for k, f in enumerate(keys):
        key = {"t": to_t(f), "s": [bezier(traced[p][k])]}
        if k < len(keys) - 1:
            key["i"] = {"x": 0.833, "y": 1}
            key["o"] = {"x": 0.167, "y": 0}
        ks.append(key)
    items = [{"ty": "sh", "ks": {"a": 1, "k": ks}}]
    if sw:
        items.append({"ty": "st", "c": {"a": 0, "k": rgb(INK)}, "o": {"a": 0, "k": 100}, "w": {"a": 0, "k": sw}, "lc": 2, "lj": 2})
    items.append({"ty": "fl", "c": {"a": 0, "k": rgb(fill)}, "o": {"a": 0, "k": 100}, "r": 1})
    items.append({"ty": "tr", "p": {"a": 0, "k": [0, 0]}, "a": {"a": 0, "k": [0, 0]}, "s": {"a": 0, "k": [100, 100]},
                  "r": {"a": 0, "k": 0}, "o": {"a": 0, "k": 100}})
    layers.append({"ddd": 0, "ind": idx + 1, "ty": 4, "nm": p, "sr": 1, "ip": 0, "op": op, "st": 0, "bm": 0,
                   "ks": {"o": {"a": 0, "k": 100}, "r": {"a": 0, "k": 0}, "p": {"a": 0, "k": [0, 0, 0]},
                          "a": {"a": 0, "k": [0, 0, 0]}, "s": {"a": 0, "k": [100, 100, 100]}},
                   "shapes": [{"ty": "gr", "it": items}]})
anim = {"v": "5.7.4", "fr": OUT_FPS, "ip": 0, "op": op, "w": W, "h": H, "nm": LOOK, "ddd": 0, "assets": [], "layers": layers}
json.dump(anim, open(OUT, "w"), separators=(",", ":"))
print(OUT, LOOK, "frames", FIRST, "to", LAST, f"({(LAST - FIRST) / fps:.2f}s)", "keys", len(keys))
