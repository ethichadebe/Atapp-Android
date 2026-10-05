"""Trace a dancer from video into a Lottie, built the way the original Atapp
dance was: flat-colour shapes per body part, each redrawn at ~10 key poses a
second and morphed between them, played at 60 fps.

    trace.py VIDEO POSE.json OUT.json FIRST LAST

FIRST and LAST are video frame numbers: keep it to about 3 seconds. Run from a
folder holding selfie_multiclass_256x256.tflite (saved as multiclass.tflite).
STYLE below holds the zep dancer's colours: set a new dancer's own.
"""
import json, sys
import cv2, numpy as np, mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
from scipy.signal import savgol_filter

VIDEO, POSE, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
FIRST, LAST = int(sys.argv[4]), int(sys.argv[5])
STEP, OUT_FPS, W, H = 3, 60, 500, 800

# Her look, in the original's flat style (same ink and outline weights).
INK = "#14132a"
STYLE = {  # part: (fill, outline width or 0)
    "hair": ("#1d1726", 0), "face": ("#6e4433", 6), "midriff": ("#6e4433", 0),
    "jacket": ("#2a2833", 0), "sleeveL": ("#2a2833", 0), "sleeveR": ("#2a2833", 0),
    "handL": ("#6e4433", 4), "handR": ("#6e4433", 4),
    "legL": ("#16141f", 0), "legR": ("#16141f", 0),
    "shoeL": ("#f4f4f2", 5), "shoeR": ("#f4f4f2", 5),
}
POINTS = {"hair": 34, "face": 22, "midriff": 16, "jacket": 32, "sleeveL": 26, "sleeveR": 26,
          "handL": 14, "handR": 14, "legL": 30, "legR": 30, "shoeL": 16, "shoeR": 16}
# Top of the stack first, as in the original's layer order.
STACK = ["handL", "handR", "sleeveL", "sleeveR", "face", "hair", "jacket", "midriff", "legL", "legR", "shoeL", "shoeR"]

d = json.load(open(POSE))
fps = d["fps"]
raw = [np.array(f)[:, :2] if f is not None else None for f in d["frames"]]
for i in range(len(raw)):
    if raw[i] is None:
        raw[i] = raw[i - 1]
POSEP = savgol_filter(np.stack(raw), 7, 2, axis=0)

seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
    base_options=BaseOptions(model_asset_path="multiclass.tflite"), output_category_mask=True))


def seg_dist(px, a, b):
    ab = b - a
    t = np.clip(((px - a) @ ab) / max(ab @ ab, 1e-6), 0, 1)
    return np.linalg.norm(px - (a + t[:, None] * ab), axis=1)


def parts_for(img, P):
    """Label every pixel of the dancer with a body part."""
    h, w = img.shape[:2]
    cls = np.squeeze(seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB))).category_mask.numpy_view())
    cls = cv2.medianBlur(cls.astype(np.uint8), 5)
    ys, xs = np.nonzero(cls > 0)
    px = np.stack([xs, ys], 1).astype(float)
    c = cls[ys, xs]
    # Picture-left limbs are the dancer's right (they face the camera).
    shL, shR, elL, elR, wrL, wrR = P[12], P[11], P[14], P[13], P[16], P[15]
    hpL, hpR, knL, knR, anL, anR = P[24], P[23], P[26], P[25], P[28], P[27]
    hip, sh = (hpL + hpR) / 2, (shL + shR) / 2
    # Where the crop jacket ends: the midriff, ~3/4 of the way from shoulders to hips.
    waist = sh + (hip - sh) * 0.78
    d_arm = {s: np.minimum(seg_dist(px, a, b), seg_dist(px, b, cc)) for s, (a, b, cc) in
             {"L": (shL, elL, wrL), "R": (shR, elR, wrR)}.items()}
    d_leg = {s: np.minimum(seg_dist(px, a, b), seg_dist(px, b, cc)) for s, (a, b, cc) in
             {"L": (hpL, knL, anL), "R": (hpR, knR, anR)}.items()}
    torso_w = np.linalg.norm(shL - shR)
    d_torso = seg_dist(px, sh, hip) - torso_w * 0.45
    label = np.full(len(px), "", object)
    label[c == 1] = "hair"
    label[c == 3] = "face"
    # Skin on the body: hands near the wrists, midriff near the waist.
    skin = c == 2
    near_hand = np.minimum(np.linalg.norm(px - wrL, axis=1), np.linalg.norm(px - wrR, axis=1))
    hand_side = np.where(np.linalg.norm(px - wrL, axis=1) < np.linalg.norm(px - wrR, axis=1), "handL", "handR")
    is_hand = skin & (near_hand < torso_w * 0.6)
    label[is_hand] = hand_side[is_hand]
    # Midriff: skin between the jacket and the trousers, inside the torso only.
    along0 = (px - sh) @ (hip - sh) / max((hip - sh) @ (hip - sh), 1e-6)
    across = np.abs((px - hip) @ (hpR - hpL)) / max(np.linalg.norm(hpR - hpL), 1e-6)
    mid = (c == 2) | ((c == 4) & (img[ys, xs][:, 2] > img[ys, xs][:, 0] + 15) & (img[ys, xs].mean(1) > 45))
    is_mid = mid & ~is_hand & (along0 > 0.6) & (along0 < 1.0) & (across < torso_w * 0.75)
    label[is_mid] = "midriff"
    # Shoes: the "accessories" class or bright pixels, near an ankle.
    bright = img[ys, xs].mean(1) > 150
    near_ank = np.minimum(np.linalg.norm(px - anL, axis=1), np.linalg.norm(px - anR, axis=1)) < torso_w * 0.55
    shoe = ((c == 5) | ((c == 4) & bright)) & near_ank & (px[:, 1] > (knL[1] + knR[1]) / 2)
    label[shoe] = np.where(np.linalg.norm(px[shoe] - anL, axis=1) < np.linalg.norm(px[shoe] - anR, axis=1), "shoeL", "shoeR")
    # Clothes: sleeves, jacket, legs — by the nearest bone.
    cl = ((c == 4) | (c == 5)) & ~shoe & (label != "midriff")
    along = (px - sh) @ (hip - sh) / max((hip - sh) @ (hip - sh), 1e-6)  # 0 at shoulders, 1 at hips
    stack_d = np.stack([d_arm["L"], d_arm["R"], np.maximum(d_torso, 0), d_leg["L"], d_leg["R"]], 1)
    best = stack_d.argmin(1)
    torso_px = best == 2
    upper = along < 0.78
    names = np.array(["sleeveL", "sleeveR", "jacket", "legL", "legR"], object)
    lab_cl = names[best]
    # The torso region below the waist is the top of the trousers: split it by side.
    lower_torso = torso_px & ~upper
    side = ((px - hip) @ (hpR - hpL)) > 0
    lab_cl[lower_torso] = np.where(side[lower_torso], "legR", "legL")
    # Above the waist a "leg" pixel is really jacket.
    lab_cl[np.isin(lab_cl, ["legL", "legR"]) & upper & (along < 0.7)] = "jacket"
    label[cl] = lab_cl[cl]
    out = {}
    for part in POINTS:
        m = np.zeros((h, w), np.uint8)
        sel = label == part
        m[ys[sel], xs[sel]] = 255
        k = 15 if part == "hair" else 7
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((k, k), np.uint8))
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((k // 2 + 1, k // 2 + 1), np.uint8))
        m = cv2.GaussianBlur(m, (0, 0), 3 if part == "hair" else 1.5)
        m = (m > 127).astype(np.uint8) * 255
        out[part] = m
    # Her hair is one big full shape around her face: the rounded outline of
    # hair and head together, puffed out a little, drawn behind the face.
    head = cv2.bitwise_or(out["hair"], out["face"])
    cs_, _ = cv2.findContours(head, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if cs_:
        pts_ = np.vstack([c_[:, 0, :] for c_ in cs_ if cv2.contourArea(c_) > 40] or [cs_[0][:, 0, :]])
        hull = cv2.convexHull(pts_.astype(np.int32))
        hm = np.zeros_like(head)
        cv2.fillPoly(hm, [hull], 255)
        hm = cv2.dilate(hm, np.ones((9, 9), np.uint8))
        out["hair"] = hm
    return out, cls


def outline(mask, n, anchor):
    """Largest outer contour, resampled to n points, starting nearest `anchor`, clockwise."""
    cs, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not cs:
        return None
    c = max(cs, key=cv2.contourArea)
    if cv2.contourArea(c) < 60:
        return None
    c = c[:, 0, :].astype(float)
    c = cv2.approxPolyDP(c.astype(np.float32), 1.5, True)[:, 0, :].astype(float)
    if len(c) < 4:
        return None
    seg_len = np.linalg.norm(np.diff(np.vstack([c, c[:1]]), axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg_len)])
    t = np.linspace(0, s[-1], n, endpoint=False)
    pts = np.stack([np.interp(t, s, np.append(c[:, k], c[0, k])) for k in (0, 1)], 1)
    area = 0.5 * np.sum(pts[:, 0] * np.roll(pts[:, 1], -1) - np.roll(pts[:, 0], -1) * pts[:, 1])
    if area < 0:
        pts = pts[::-1]
    i0 = np.argmin(np.linalg.norm(pts - anchor, axis=1))
    return np.roll(pts, -i0, axis=0)


# ── Trace each key pose ─────────────────────────────────────────────────────
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

ANCHOR = {"hair": 0, "face": 0, "midriff": 23, "jacket": 0, "sleeveL": 12, "sleeveR": 11, "handL": 16, "handR": 15,
          "legL": 24, "legR": 23, "shoeL": 28, "shoeR": 27}
traced = {p: [] for p in POINTS}
heights, centres = [], []
for f in keys:
    P = POSEP[f]
    parts, cls = parts_for(frames[f], P)
    ys, xs = np.nonzero(cls > 0)
    heights.append(ys.max() - ys.min())
    centres.append([(P[23, 0] + P[24, 0]) / 2, ys.max()])
    for p in POINTS:
        o = outline(parts[p], POINTS[p], P[ANCHOR[p]] + (np.array([0, -1000]) if p in ("hair", "face", "jacket") else 0))
        traced[p].append(o)

# Fill a part's missing keys from its neighbours (a hand lost to motion blur).
for p, seq in traced.items():
    for k in range(len(seq)):
        if seq[k] is None:
            prev = next((seq[j] for j in range(k - 1, -1, -1) if seq[j] is not None), None)
            nxt = next((seq[j] for j in range(k + 1, len(seq)) if seq[j] is not None), None)
            seq[k] = prev if prev is not None else nxt
    if all(x is None for x in seq):
        seq[:] = [np.zeros((POINTS[p], 2)) + POSEP[keys[k]][23] for k in range(len(seq))]

# Keep each point on the same spot of the body from key to key: re-start each
# outline where it best lines up with the previous one.
for p, seq in traced.items():
    for k in range(1, len(seq)):
        if seq[k] is None or seq[k - 1] is None:
            continue
        a, b = seq[k - 1], seq[k]
        shifts = [np.linalg.norm(np.roll(b, -s, 0) - a, axis=1).sum() for s in range(len(b))]
        seq[k] = np.roll(b, -int(np.argmin(shifts)), 0)

# Into the 500x800 frame: the camera zooms, so scale by her (smoothed) height,
# feet on a fixed floor, travel kept modest.
hs = savgol_filter(np.array(heights, float), min(9, len(heights) // 2 * 2 - 1), 1)
cs = np.array(centres, float)
scale = 700 / hs
cx = cs[:, 0]
cx_rel = (cx - np.median(cx)) * scale
offx = W / 2 + np.clip(cx_rel * 0.5, -30, 30)
floor = 785


def to_comp(pts, k):
    return np.stack([(pts[:, 0] - cx[k]) * scale[k] + offx[k], (pts[:, 1] - cs[k, 1]) * scale[k] + floor], 1)


for p, seq in traced.items():
    arr = np.stack([to_comp(s, k) for k, s in enumerate(seq)])  # (keys, n, 2)
    if len(arr) >= 5:
        arr = savgol_filter(arr, 5, 2, axis=0)  # steady the outlines between keys
    traced[p] = arr


def bezier(pts):
    """Smooth closed curve through pts (Catmull-Rom tangents)."""
    t = (np.roll(pts, -1, 0) - np.roll(pts, 1, 0)) / 6
    return {"c": True, "v": pts.round().astype(int).tolist(), "i": (-t).round().astype(int).tolist(), "o": t.round().astype(int).tolist()}


def rgb(h):
    return [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)] + [1]


to_t = lambda f: round((f - FIRST) * OUT_FPS / fps)
op = to_t(LAST)
layers = []
for idx, p in enumerate(STACK):
    fill, sw = STYLE[p]
    ks = []
    for k, f in enumerate(keys):
        key = {"t": to_t(f), "s": [bezier(traced[p][k])]}
        if k < len(keys) - 1:
            key["i"] = {"x": 0.833, "y": 1}  # the original's easing
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

anim = {"v": "5.7.4", "fr": OUT_FPS, "ip": 0, "op": op, "w": W, "h": H, "nm": "zep", "ddd": 0, "assets": [], "layers": layers}
json.dump(anim, open(OUT, "w"), separators=(",", ":"))
print(OUT, "keys", len(keys), "frames", op, "scale range", scale.min().round(2), scale.max().round(2))
