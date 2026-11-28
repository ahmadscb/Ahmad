# Motion Studio asset library: API reference

Load the libraries after GSAP and `lib/bm-core.js`, in this order:

```html
<script src="../../vendor/gsap.min.js"></script>
<script src="../../lib/bm-core.js"></script>
<script src="../../lib/characters.js"></script>   <!-- BM.CH -->
<script src="../../lib/world.js"></script>        <!-- BM.ENV, BM.PROP -->
<script src="../../lib/camera.js"></script>       <!-- BM.CAM, BM.TR, BM.CAP, BM.say -->
<script src="../../lib/styles.js"></script>       <!-- BM.STYLE: six style packs -->
```

Visual catalog: `library/catalog/` (render it with `node tools/snap.mjs library/catalog /tmp/cat 0 1 11 12 13 22`). Working example: `templates/cartoon/index.html`. All `at`, `t0` and `t1` values are seconds on the timeline. Everything is deterministic and seek-safe.

## Characters: `BM.CH`

The same id gives the same look in every scene and every video.

| id | who | look |
|---|---|---|
| `dave` | office guy / trader | spiky brown hair, blue hoodie |
| `maya` | designer | black bob, coral T-shirt, glasses, earrings |
| `omar` | manager / boss | bald, beard, navy suit, red tie, wide build |
| `lina` | consultant | teal hijab, cream blazer |
| `kenji` | developer | slick black hair, dark T-shirt, red headphones |
| `grace` | senior colleague | grey bun, purple cardigan, glasses |
| `leo` | kid | red cap, yellow T-shirt, freckles (short) |
| `sam` | intern | curly hair, green hoodie, lanyard |
| `rex` | CEO | black suit, gold tie, mustache, wide build |
| `zara` | athlete / creator | ponytail, purple T-shirt, earrings |

### Building a character

- `ch = CH.make(parent, id, x, groundY, scale, {mode:'flat'|'ink'|'line', legs:true})` builds the rig.
  - Feet sit at (x, groundY). A full figure is about 600×scale px tall.
  - `legs:false` gives a bust, for behind desks.
- The rig's joints are:
  - `ch.root` (x/y move the whole character; sx/sy squash);
  - `ch.torso`, `ch.head`;
  - `ch.Rarm`, `ch.Rfore`, `ch.Larm`, `ch.Lfore`;
  - `ch.Rthigh`, `ch.Rshin`, `ch.Lthigh`, `ch.Lshin`.
  
  Animate them with `BM.jto(j, at, {r|x|y|sx|sy}, dur, ease)`. Never animate `transform` directly.
- **Expressions** (`CH.expr(ch, at, name)`, 23 of them):
  - positive: neutral, smile, happy, laugh, smug, ecstatic ($-eyes), sly, love, wink, proud, starstruck;
  - fear and surprise: shock, panic, scared, nervous;
  - negative: sad, cry, angry, furious, deadpan, confused, sleepy, disgusted.
  
  Extras switch on automatically: tears, sweat, anger vein, zzz, "?", blush, sparkles.
- **Poses** (`CH.pose(ch, at, name, dur)`, with built-in anticipation, overshoot and settle; `CH.snap` sets one instantly):
  - neutral, wave, point, pointUp, armsUp, handsHips, crossArms;
  - thinking, facepalm, shrug, thumbsUp, typing, phone, clap;
  - hideFace, presenter, sip, stretch, sneak.
- **Actions:**
  - locomotion: `CH.walk(ch, at, dur, dx)`, `CH.run`, `CH.sneak`;
  - sitting: `CH.sit(ch, at, seatDrop)`, `CH.stand`;
  - big moves: `CH.jump`, `CH.celebrate`, `CH.cry(ch, t0, t1)`, `CH.dance(ch, t0, t1, bpm)`;
  - small moves: `CH.typing(ch, t0, t1)`, `CH.nod`, `CH.shakeHead`, `CH.startle`, `CH.fall`.
- **Life:**
  - `CH.idle(ch, t0, t1)`: breathing, head drift and blinks. Give every on-screen character idle for the whole shot.
  - `CH.blinks`, `CH.look(ch, at, lx, ly)`.
- **Animation principles:**
  - `CH.squash(ch, at, amt)` for squash and stretch;
  - `CH.jiggle(ch, at)` for secondary motion on tie, ponytail and head;
  - `CH.pose` has anticipation and follow-through built in.
- **Talking:**
  - `CH.talk(ch, t0, t1)` gives procedural mouth flaps.
  - `CH.lipsync(ch, t0, visemes)` is audio-driven (see Voice).

## Environments and props: `BM.ENV`, `BM.PROP`

- `a = ENV.<name>(stageGroup, opts)` draws a full vertical set with its own ambient motion and returns anchors.
  - Every set returns `a.floorY` and `a.cx`.
  - Extra anchors per set: `office` adds `deskY`; `bedroom` adds `bedY`; `restaurant` adds `tableY`; `luxury` (penthouse with sea view) adds `sofaY`; `park` adds `benchY`; `kitchen` adds `counterY`.
  - Sets with no extra anchor: `street` (traffic, parallax), `classroom` (blackboard), `stage` (spotlights).
- **Props:** `p = PROP.<name>(parent, x, y, scale, opts)`. Feet or base sit at y.
  - furniture: `desk` (returns top), `chair` (seatY), `lamp`;
  - screens: `monitor` (`p.screen` is a group to draw the screen content into), `laptop` (`p.lid` joint), `phone` (`p.j`, `p.screen`);
  - money: `money` (`p.j`), `coin`;
  - vehicles: `car` (`p.j`, and `p.spin(at, dur)` for the wheels);
  - small objects: `mug` (steam), `plant` (sways), `clock` (ticks), `briefcase`, `papers`, `trophy`, `waterCooler`;
  - text: `bubble(parent, x, y, text)`.

## Camera and transitions: `BM.CAM`, `BM.TR`

- **Stage:** create one with `sc = BM.scene('name')`.
  - Set the start with `Object.assign(sc.cam, {x, y, z: 1.1}); sc.apply()`. Keep `z ≥ 1.05`.
- **Moves:**
  - `CAM.push(sc, at, z, dur)` and `CAM.pan(sc, at, x, y, dur)`;
  - `CAM.dolly(sc, at, x, y, z, dur)` and `CAM.dutch(sc, at, deg)`;
  - `CAM.punch(sc, at, x, y, z, hold, back)` for a comedic snap zoom;
  - `CAM.whip(sc, at, x, y)` for a whip pan with motion blur and a whoosh;
  - `CAM.handheld(sc, t0, t1, amp)`, `CAM.follow(sc, t0, t1, t => [x, y])` and `BM.shake(sc, at, amp, dur)`.
- **Transitions** (each covers the cut at its midpoint):
  - `TR.cut(at, fromSc, toSc, kind, dur)`, where kind is one of flash, dip, iris, wipe, slam (comic panels), ink (splash), glitch or zoomThrough;
  - a plain hard cut is `BM.cut(at, from, to)`.

## Captions: `BM.CAP`, `BM.say`

- `BM.say(ch, t0, t1, text, {bubble, visemes, speaker, subStyle})` does three things in one call:
  - drives the mouth (lip-sync if `visemes` is given, otherwise procedural);
  - shows a karaoke subtitle;
  - optionally shows a speech bubble that follows the character.
- `CAP.sub(t0, t1, text, style)` is a subtitle only. Set `CAP.style` (or `BM.STYLE.use(...)`) to change the subtitle look for a whole video.
- `CAP.fromTimings(lines)` builds automatic subtitles from narration timings.
- `CAP.burst(stageGroup, at, x, y, 'BAM!')` is a comic onomatopoeia.

## Voice and lip-sync (local, free)

1. Write `projects/<name>/dialogue.json` with `{"lines": [{"who": "omar", "text": "..."}, ...], "duration": 30}`.
   - Add `"t0"` to a line to pin it to a time; otherwise lines run in sequence with `gap`.
2. Run `python3 tools/voice.py projects/<name>/dialogue.json projects/<name>/voice`.
   - It writes `voice/dialog.wav`, `voice/dialog.json` and `voice/dialog.js` (with each line's real `t0`/`t1` and per-frame `visemes`).
   - Each cast member always has the same voice.
3. In the page, add `<script src="voice/dialog.js"></script>`. Then, for each line, call `BM.say(CH_BY_ID[l.who], l.t0, l.t1, l.text, {visemes: l.visemes})`.
   - **Time the visuals from `DIALOG.lines`**, not from guesses.
4. Render with `bin/bm-render projects/<name> --voice projects/<name>/voice/dialog.wav`.
5. Credit line for descriptions: "Voices: Piper / LibriTTS-R (CC BY 4.0)".

`tools/lipsync.py any.wav` turns any voice file into visemes.

## Sound: `BM.sfx(t, type, gain)` and `BM.music(t0, t1, style, gain)`

- **Effects (53):**
  - comedy: boing, bonk, trombone, rimshot, cricket, laugh, gulp, slurp, slurp_empty, squeak, twitch, gasp, spit, scratch, fall, sting, drumroll;
  - movement: whoosh, swoosh, step, tiptoe, door, zip, creak, flutter;
  - hits: punch, thud, hit, impact, crack, crash, shatter, sub_drop;
  - devices and UI: keys (typing), notify, ding, pop, tick, glitch, shutter, alarm, horn, buzz;
  - money: coin, register, cash_tiny;
  - ambient: rain, heartbeat;
  - premium: riser, swell, shimmer, glint, paper.
- **Music (12):**
  - comedy and light: sneaky (comic tiptoe), cartoon, lofi, lofi_broke;
  - mood: sad, tension, cinematic;
  - upbeat: hype, corporate, pulse;
  - specialised: edu, product.

## Styles: `BM.STYLE`

`BM.STYLE.use('cartoon'|'premium'|'edu'|'comic'|'infographic'|'product3d')` returns the style pack: palette, fonts, subtitle style, easing, character mode, preferred transitions, music and components. See `lib/styles.js` and `library/styles/` (the rendered showcase).

## Comedy timing rules (cartoon style)

- **Setup → beat → payoff.** Hold 0.3–0.5 s of stillness (a "beat") before the reveal.
- **Fast, then hold.** The fast action resolves in 0.15–0.25 s; the reaction holds for at least 0.6 s.
- **Takes.** Use `CH.startle` and a `CAM.punch` on the face, with `boing` or `gasp` on the same frame.
- **Rule of three.** Repeat the gag twice, then break the pattern on the third.
- **End sting.** Finish on a punchline frame with `rimshot`, `trombone` or `cricket`, then hold 1 s.
