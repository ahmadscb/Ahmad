# Sarcastic Grotesque: face-first reaction-meme comedy

`lib/grotesque.js` (`BM.GR`) is a **separate** character system: the simple `BM.CH` puppets are untouched. Use it when the brief asks for sarcastic, ugly-funny, meme-style or reaction comedy.

The face is the punchline.

- **Template:** `bin/bm-new <name> --dur 20 --template grotesque`
- **Sheets:** `library/grotesque/sheets/`
- **Style pack:** `BM.STYLE.use('grotesque')` (Anton meme subtitles)

Load order:

```html
<script src="../../vendor/gsap.min.js"></script>
<script src="../../lib/bm-core.js"></script>
<script src="../../lib/camera.js"></script>
<script src="../../lib/styles.js"></script>
<script src="../../lib/grotesque.js"></script>
```

## The cast (original characters, fixed identities)

Each character has a default attitude (their **base**), a distinct head silhouette, nose, teeth and voice.

| id | who | look | base |
|---|---|---|---|
| `gary` | exhausted office employee | long droopy egg head, comb-over, eye bags, stubble, coffee-stained shirt | dead inside |
| `brock` | smug boss | wide boxy jaw, helmet hair, mustache, double chin, navy suit | smug |
| `kyle` | fake motivational manager | spray-tan, spiky blond quiff, headset, giant veneers, "TEAM LEAD" lanyard | fake smile |
| `vlad` | dramatic crypto trader | big potato head, bulging bloodshot eyes, mop and cowlick, gold ₿ chain, hoodie | panic |
| `tiff` | gossip girl | pointy heart-shaped chin, lashes, glossy lips, ponytail, hoops | side-eye |
| `bev` | judgmental auntie | jowly box head, curlers, red cat-eye glasses on a chain, chin mole, pearls | judgmental |
| `zeke` | weird influencer | split teal/pink mullet, ring-light eyes, crooked nose, tiny mustache, neon tank | psycho smile |
| `marco` | broke guy acting rich | long narrow face, slick hair, sunglasses on head, pencil mustache, gold tooth, chipped fake chain | overconfident |
| `dale` | overconfident salesman | huge shiny forehead dome, side tufts, cleft chin, horse teeth, plaid blazer | overconfident |
| `pip` | chaotic best friend | frizzy orange hair, buck teeth with a gap, freckles, band-aid, stripes | manic laugh |

To build one, call `ch = GR.make(stageGroup, id, x, y, scale)`.

- `(x, y)` is the **head centre**. The bust (shoulders and chest) hangs below, so put a desk or frame edge over the lower body.
- Scale 1 gives a head about 470 px tall.

## Expressions (33): `GR.expr(ch, at, name)` morphs; `GR.react(ch, at, name, opts)` snaps

Every expression actually reshapes the face: jaw length, eye size per eye, lid angles, mouth shape, crooked teeth, gums, tongue, wrinkles, folds and colour overlays. They aren't brow tweaks.

The expressions, by group:

- **Smug and sly:** smug, plotting, evilGrin, sarcasticClap, passiveAggro, overconfident, judgmental.
- **Fake:** fakeSmile, fakePro, psychoSmile.
- **Shock and fear:** shockScream, panic, terrified, whatDidISee, caughtLying, overwhelmed.
- **Negative:** disgust, cringe, jealous, suspicious, sideEye, embarrassed.
- **Broken:** deadInside, done, sleepyBroken.
- **Crying:** uglyCry, hystericalCry, heartbreak.
- **Rage:** angryMeltdown, unhingedRage.
- **Manic:** manicLaugh, greedy.
- **Reset:** neutral.

Plain-English aliases also work, for example `'dead inside'`, `'caught lying'` or `'full unhinged rage'`.

Some expressions bring hands automatically:

| Expression | Hands |
|---|---|
| panic, terrified | hands on cheeks |
| angryMeltdown, unhingedRage | fists |
| plotting | steepled fingers |
| sarcasticClap | slow clap |
| greedy | rubbing hands |
| overwhelmed | grabbing head |
| embarrassed | scratching head |
| heartbreak | hand on chest |
| fakePro | adjusting tie |
| overconfident | thumbs up |
| caughtLying | shrug |

Call `GR.hands(ch, at, preset)` to set them yourself. The presets are rest, cheeks, grabhead, facepalm, clap, fists, steeple, shrug, chest, rub, thumbs, point, scratch, tie, phone, selfie and temples.

## Animation behaviour

| Call | What it does |
|---|---|
| `GR.react(ch, at, name, {sc, shot, pop, sfx, smear, hands})` | **The reaction shot**: anticipation squash (0.12 s) → snap with overshoot → squash/stretch pulse, head jerk and smear ghosts → elastic settle. With `sc` it also punches the camera (`shot`: close, ecu or mouth). Default sfx is `boom` |
| `GR.pop(ch, at, hold)` | eyes pop out, pupils pinpoint |
| `GR.jawDrop(ch, at, amt, hold)` | jaw falls with a bounce and the skull stretches |
| `GR.blink`, `GR.jerk(ch, at, dx, dy)`, `GR.recoil` | exaggerated blink, head jerk, recoil |
| `GR.smear(ch, at)` | smear frames |
| `GR.tremble(ch, t0, t1, amp)`, `GR.wobble(ch, t0, t1)` | shaking, lip wobble |
| `GR.tearBurst(ch, t0, t1)` | tear fountains |
| `GR.hold(ch, t0, t1)` | **comedic hold**: stops idle drift and blinks, so the face freezes |
| `GR.laugh(ch, t0, t1)` | manic bouncing laugh |
| `GR.clap(ch, t0, t1, rate)` | slow sarcastic clap, synced to clap sfx |
| `GR.escalate(ch, t0, ['panic', 'terrified', 'hystericalCry', 'unhingedRage'], .55)` | rapid escalation, each step a snap |
| `GR.slide(ch, at, dx, dur)` | bust walks in or out with a bob |
| `GR.say(ch, t0, t1, text, {visemes})` | lip-synced talking on top of any expression, plus a meme subtitle |

## Shot grammar (use it; it's what makes this style funny)

1. **Framing** is set per character with `GR.frame(ch, kind)`, where kind is wide, medium, close, ecu (eyes) or mouth.
   - Hard cut: `GR.cutTo(sc, at, ch, kind)`.
   - Snap zoom with whoosh: `GR.punch(sc, at, ch, kind)`.
   - Creep-in on a hold: `GR.drift(sc, t0, dur)`.
2. **The beat:**
   1. **SETUP** in medium (1–2 s, a normal moment).
   2. **TRIGGER** (something happens; sfx).
   3. **SNAP REACTION:** `GR.react` with a punch to close or ecu, plus `GR.backdrop(ch, at, dur, 'speed'|'burst'|'rage'|'dread')`.
   4. **COMEDIC HOLD** of 0.6–1.2 s (`GR.hold`).
   5. **Hard cut** to the next beat.
3. **Coverage:**
   - At least 50 % of screen time is close-ups or ECUs.
   - Cut every 1.2–2.5 s.
   - No wide shot lasts more than 2 s.
   - Every video has at least three snap reactions.
4. **Contrast normal and absurd.** Stay calm and quiet right before the face explodes. Silence or crickets work before the boom.
5. **The punchline is a face.** End on an ECU reaction plus a meme caption (`GR.meme(at, dur, 'TEXT', {pos: 'top'})`) and a comedic sound (boom, rimshot, cricket, trombone, wrong, dun).
6. **Escalation.** Repeat the gag with bigger faces each time (rule of three), or use `GR.escalate`.

## Sets and props

- **Sets:** `GR.BG.office(p)`, `GR.BG.desk(p, x, y)`.
- **Reaction backgrounds:** `GR.BG.burst`, `.speed`, `.dread`, `.rage`, `.void`.
- **Monitor:** `m = GR.monitor(p, x, y, s, {key: GR.SCREENS.meme|spreadsheet|crash|off})`. Switch screens with `m.flip(at, key)`.
- **Captions:** `GR.meme(at, dur, text)` for top/bottom meme text; `GR.label(at, dur, '9:01 AM')`.
- **Other places:** build any other set with plain SVG (`BM.R`, `BM.PA`) using **thick ink outlines (#16110E, stroke 7–9) and muted, dirty colours**. Draw the set behind the characters, and any foreground (desk, car door, phone frame) after them.

## Sound

- **Comedy sfx:**
  - impacts and cues: boom, zoom_in, punch, dun, wrong, gong;
  - camera and face moves: whoosh, slide_down, slide_up, eyepop;
  - comedy reactions: rimshot, cricket, trombone, gasp, laugh, squish;
  - hands and objects: clap, keys, notify, register.
- **Music:** awkward, drama, sneaky, tension, hype, sad.
- **Mix:** keep the music low (gain 0.5–0.7). The face sfx carry the jokes.

## Quality gate (check before accepting a render; iterate if any answer is "no")

1. Is every reaction readable at phone size within 0.5 s, from the face alone?
2. Do the faces actually deform (jaw, eyes, mouth shape), or did only the brows move?
3. Are at least half the frames close-ups or ECUs, with at least three snap reactions?
4. Is there a calm "normal" beat before each absurd face?
5. Does the video end on a face punchline with a held frame of at least 1 s?
6. Is there nothing cute or plain on screen: every character in a strong attitude, never idle-neutral for long?
