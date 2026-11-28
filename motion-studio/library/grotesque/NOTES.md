# Sarcastic Grotesque: what changed, test results, limitations

## What changed from the old simple style

| | Old (`lib/characters.js`, untouched) | New (`lib/grotesque.js`) |
|---|---|---|
| Faces | fixed round head; expressions swap eye, brow and mouth presets | **head, eyes, lids, brows, mouth, teeth and wrinkles redrawn every frame from about 80 shape parameters**. The jaw drop stretches the skull, each eye bulges separately, and the mouth goes from a slit to a squared grimace or a full scream |
| Look | clean flat vector, cute proportions | caricature with thick boiling ink lines (animated turbulence), cel shading with hatching, pores, eye bags, stubble, crooked uneven teeth (gold, gap, buck), bloodshot veins |
| Characters | 10 friendly puppets, similar silhouettes | 10 original caricatures with distinct skulls (boxy jaw, egg, potato, heart-chin, dome forehead), noses, teeth and a default attitude each |
| Expressions | 23, mostly small variations | 33 per character, each with real shape distortion, plus FX: tear streams and fountains, snot bubble, sweat, anger vein, ear steam, gloom lines, shock lines, $ eyes, glowing pupils, green/red/pale skin |
| Motion | pose tweens | anticipation squash → snap with overshoot → squash/stretch pulse → elastic settle; smear ghosts; eye pop; bouncing jaw drop; lip wobble; trembling; twitch; manic laugh bounce; slow clap; comedic holds |
| Film language | wide stage shots | face-first shot grammar: per-character framing (medium, close, eye ECU, mouth), punch-in zooms, reaction backdrops (burst, speed lines, rage, dread), meme captions, boom/zoom/dun sounds |
| Pipeline | `bm-agent` | `bm-agent --style grotesque` loads the style's rules and makes the agent pass a 6-point quality gate before rendering |

## The three test videos (made by `bin/bm-agent ... --style grotesque --run`, no manual building)

| Video | Length | Snap reactions | Close-up share (agent's estimate) | QC | Render (3 cores) | Agent session |
|---|---|---|---|---|---|---|
| `projects/office-sarcasm` | 20 s | 7 | about 75 % | pass, −14.3 LUFS | 287 s, 757 MB peak | 58 turns, 15.8 min, $2.49 equivalent |
| `projects/crypto-meltdown` | 20 s | 8 | about 60 % | pass, −14.5 LUFS | 244 s, 755 MB peak | 28 turns, 9.5 min, $1.78 equivalent |
| `projects/fake-rich` | 22 s | 8 | about 78 % | pass, −14.1 LUFS | 315 s, 765 MB peak | 41 turns, 13.0 min, $2.62 equivalent |

**Quality gate:** each agent reported 6/6, and I checked frames from each MP4 independently. One weakness: in office-sarcasm, the boss's close-ups reuse the same smug face too often.

**Render speed:** about 0.45 s per frame, against 0.08 s for the old flat style. The per-frame redraw and the boiling-line filter cost about 5–6× more. That is still about 5 minutes for a 20-second reel.

**First attempt:** the three agents first ran in parallel and hit the plan's 5-hour usage limit before building anything. They were re-run one at a time after the limit reset.

## Limitations that still cap the facial comedy

1. **Vector, not painted.** There's no painterly texture, airbrush or skin rendering, so the grotesque look is "ink comic", not "oil-painted gross-out" art. A raster painting pass (an image model) would need a paid or GPU service, which this setup avoids.
2. **Front view only.** Heads don't turn to three-quarter or profile. Side-eye is faked with pupils and head tilt.
3. **No frame-by-frame acting.** Reactions are parameter morphs with overshoot. A human animator's hand-drawn smears and breakdown drawings are stronger. The smear here is a ghost-and-stretch approximation.
4. **Busts only.** These characters have no legs. Walking is a bust slide with a bob, so physical comedy (falls, chases) still needs the old full-body rig.
5. **Voices.** The local voices are one English multi-speaker model, chosen by pitch, so comedic delivery (timing, shouting, crying voice) is limited. Lip-sync uses 5 mouth shapes layered on the expression.
6. **Repetition.** The 33 expressions are shared shapes scaled by each character's anatomy. Over many videos, identical "signature" faces will start to repeat. Per-character expression variants would be the next step.
7. **No reference images used.** The references mentioned in the request never arrived, so the look follows the written description only.
