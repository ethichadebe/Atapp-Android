"""Track the main dancer's pose in every frame of a clip with MediaPipe.

    track.py VIDEO OUT_POSE.json pose_landmarker_heavy.task
"""
import sys, json, cv2, numpy as np, mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
src, out = sys.argv[1], sys.argv[2]
cap = cv2.VideoCapture(src)
fps = cap.get(cv2.CAP_PROP_FPS)
opts = vision.PoseLandmarkerOptions(base_options=BaseOptions(model_asset_path=sys.argv[3]),
    running_mode=vision.RunningMode.VIDEO, num_poses=3, min_pose_detection_confidence=0.4, min_tracking_confidence=0.4)
lm = vision.PoseLandmarker.create_from_options(opts)
frames, prev, i, size = [], None, 0, None
while True:
    ok, img = cap.read()
    if not ok: break
    h, w = img.shape[:2]; size = (w, h)
    res = lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB)), int(i * 1000 / fps))
    best, score = None, -1
    for pose in res.pose_landmarks:
        a = np.array([[p.x * w, p.y * h, p.z * w, p.visibility] for p in pose])
        span = np.ptp(a[:, 1])  # tallest figure = the dancer
        centre = a[[11, 12, 23, 24], :2].mean(0)
        s = span - (0 if prev is None else 0.5 * np.linalg.norm(centre - prev))
        if s > score: best, score = a, s
    if best is not None: prev = best[[11, 12, 23, 24], :2].mean(0)
    frames.append(None if best is None else best.round(2).tolist())
    i += 1
json.dump({"fps": fps, "size": size, "frames": frames}, open(out, "w"))
print("frames", len(frames), "missing", sum(f is None for f in frames), "size", size, "fps", fps)
