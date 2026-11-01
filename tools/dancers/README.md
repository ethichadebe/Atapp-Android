# Dancers

The opening screen plays one dancer at random per visit
(`frontend/src/splash/dancers.ts`). Each is a Lottie animation in the original
Android dance's style: flat-colour shapes per body part, about 10 key poses a
second, morphed at 60 fps, in a 500×800 frame.

- `snoop` — the Android app's original (`app/src/main/res/raw/snoop_dance.json`).
- `zep` — traced from a 3-second Zep dance clip with `trace.py`.
- `chad` and `milan` — two routines by one dancer, traced with `trace_look.py`:
  `chad` drawn as he is, `milan` dressed in a striped jersey and baggy trousers.
- `satin` — traced with `trace_look.py` from another clip, drawn as he is: red
  satin shirt, red trousers, sunglasses and a grey beard.
- `afro`, `leather`, `studs`, `balaclava`, `cargo` — five routines by one
  dancer, traced with `trace_look.py`: `afro` drawn as she is, the other four
  her moves in outfits taken from reference photos (clothes and hair only).

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
   For a short-haired dancer: `python icon.py still.png <hair hex> dancer-new 2.6 0.2`.
5. Copy the JSON to `frontend/src/splash/`, the icons to
   `frontend/src/splash/icons/`, and add an entry to `DANCERS`.

## Dressing a dancer differently

`trace_look.py` traces the same way but splits the dancer into generic parts
(hair, face, top, sleeves, bare arms, bottoms, bare legs, shoes) and lets a
*look* recombine and recolour them, with drawn extras where the clip has none:
long hair, a hat, a crop top, a chest print, knee boots, jersey stripes, baggy
trousers, a beard, sunglasses, an open collar. A look can also keep stray
furniture out (`reach`), find hands wherever they rest (`hands`), and treat a
dark box edited over the clip as trousers (`patch`). For outfits that don't
match the clip's: a single `skirt`, `sleeves` (`short` or `long`, drawn along
the arm), a `tunic` hem, `shorts`, `socks`, `shoes` drawn heel to toe (thin
heels to chunky sneakers), a `hood` (balaclava), a `bikini`, and hair drawn
head-sized whatever the dancer's own (`ponytail`, `locs`, or `none`). Looks are defined in `LOOKS` at the top of the file:

    python trace_look.py LOOK clip.mp4 pose.json new-dance.json [FIRST LAST]

Without FIRST/LAST it picks the liveliest 3 seconds.

## Reproducing the shipped dances

Each is reproduced byte for byte from its clip:

- `zep-dance.json`: `trace.py`, FIRST=4, LAST=94
- `chad-dance.json`: `trace_look.py chad`, FIRST=3, LAST=93
- `milan-dance.json`: `trace_look.py milan`, FIRST=1, LAST=91
- `satin-dance.json`: `trace_look.py satin`, FIRST=1, LAST=91 (the liveliest 3 seconds, picked automatically)
- `afro-dance.json`: `trace_look.py afro`, FIRST=13, LAST=103
- `leather-dance.json`: `trace_look.py leather`, FIRST=14, LAST=104
- `studs-dance.json`: `trace_look.py studs`, FIRST=281, LAST=371
- `balaclava-dance.json`: `trace_look.py balaclava`, FIRST=0, LAST=80
- `cargo-dance.json`: `trace_look.py cargo`, FIRST=9, LAST=99

All five picked automatically (the liveliest 3 seconds).
