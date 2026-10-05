# Dancers

The opening screen plays one dancer at random per visit
(`frontend/src/splash/dancers.ts`). Each is a Lottie animation in the original
Android dance's style: flat-colour shapes per body part, about 10 key poses a
second, morphed at 60 fps, in a 500×800 frame.

- `snoop` — the Android app's original (`app/src/main/res/raw/snoop_dance.json`).
- `zep` — traced from a 3-second Zep dance clip with the tools here.

## Adding one from a video

Best clips: one dancer, whole body in frame, phone held still, good light.
Only the movement ends up in the app, never the person's image — but use clips
you have the right to use.

1. Python 3.11 with `mediapipe opencv-python-headless numpy scipy`, and the two
   MediaPipe models from storage.googleapis.com/mediapipe-models:
   `pose_landmarker_heavy.task` and `selfie_multiclass_256x256.tflite`
   (saved as `multiclass.tflite`).
2. Track the pose: `python track.py clip.mp4 pose.json pose_landmarker_heavy.task`
3. Pick ~3 seconds (90 frames at 30 fps) and set the dancer's colours in
   `STYLE` in `trace.py`, then:
   `python trace.py clip.mp4 pose.json new-dance.json FIRST LAST`
4. Render a still and cut the icons:
   `CHROMIUM=/path/to/chrome node still.mjs new-dance.json 0 still.png 4`
   then `python icon.py still.png <hair hex> dancer-new`
5. Copy the JSON to `frontend/src/splash/`, the icons to
   `frontend/src/splash/icons/`, and add an entry to `DANCERS`.

`zep-dance.json` is reproduced byte for byte by `trace.py` from its clip with
FIRST=4, LAST=94.
