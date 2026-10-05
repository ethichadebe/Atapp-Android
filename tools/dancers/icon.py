"""Crop a dancer's head-and-shoulders icon from a still, matching the app icon.

    icon.py STILL.png HAIR_HEX OUT_PREFIX

STILL.png is a frame rendered at 4x by still.mjs; HAIR_HEX is the colour of the
shape to frame (the hair, e.g. 1d1726). Writes OUT_PREFIX-32.png (browser tab)
and OUT_PREFIX-180.png (home screen).
"""
import sys
import cv2, numpy as np

still, hair_hex, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
im = cv2.imread(still)
bgr = np.array([int(hair_hex[i:i + 2], 16) for i in (4, 2, 0)])
hair = np.abs(im.astype(int) - bgr).sum(2) < 12
hair[int(im.shape[0] * 0.35):] = False  # the head is in the top third
ys, xs = np.nonzero(hair)
x0, x1, y0 = xs.min(), xs.max(), ys.min()
side = int((x1 - x0) * 1.55)  # the same framing as icon-512.png
cx, top = (x0 + x1) // 2, max(0, int(y0 - side * 0.11))
crop = im[top:top + side, cx - side // 2: cx - side // 2 + side]
for n in (32, 180):
    cv2.imwrite(f"{prefix}-{n}.png", cv2.resize(crop, (n, n), interpolation=cv2.INTER_AREA))
