---
name: motion-studio
description: Produce finished MP4 motion graphics from a natural-language request - funny 2D cartoon shorts with consistent characters, premium product ads (3D product + kinetic type), explainers, Instagram/TikTok reels (1080x1920) and 16:9 videos - using the Bang Motion design rules plus Motion Studio's render, sound and QC pipeline. Use when the person asks for an animated video, reel, ad, cartoon, explainer or motion graphic as an MP4, or mentions Motion Studio / Bang Motion production.
---

# Motion Studio

The studio lives at `motion-studio/` in the `ahmadscb/ahmad` repository (VPS: wherever it is cloned). Design rules come from the **bang-motion** plugin skill. Read its `SKILL.md` (anti-PPT laws, style brief, camera) and, for characters, `references/kartun-panggung.md`. This skill adds production: rendering, sound, QC and limits.

## Workflow (do all of it; never stop at a storyboard)

1. Write `projects/<name>/brief.json` (schema `workflow/brief.template.json`):
   - format, type, **style** (one of the six in `lib/styles.js`), message;
   - script/dialogue, cast (from the 10 library characters), sets;
   - a shot-by-shot storyboard with times, sfx and music.
2. Scaffold with `bin/bm-new <name> --dur <s> --template cartoon` (character stories) or `--template reel` (type and graphics).
   Then build `index.html` from the **asset library** (`workflow/LIBRARY.md`):
   - `BM.CH` characters, expressions, poses and actions;
   - `BM.ENV` sets and `BM.PROP` props;
   - `BM.CAM` moves and `BM.TR` transitions;
   - `BM.say` / `BM.CAP` for subtitles and bubbles;
   - `BM.STYLE` style packs;
   - `BM.sfx` / `BM.music` for sound.
   
   Draw new things only when the library lacks them. 3D: `lib/product3d.js` (see `projects/aether-ad`).
3. **Dialogue:** write `dialogue.json` and run `python3 tools/voice.py projects/<name>/dialogue.json projects/<name>/voice`.
   - It's a free local voice per character, with lip-sync visemes.
   - Time the shots from `voice/dialog.json`.
4. Run `node tools/snap.mjs projects/<name> /tmp/check <times…>` and **look at `sheet.jpg`** (Read the image). Fix:
   - clipped or overlapping text;
   - off-model characters;
   - empty or slide-like frames;
   - props hidden behind other layers.
   
   Repeat until clean.
5. Run `bin/bm-render projects/<name> --voice projects/<name>/voice/dialog.wav` (omit `--voice` if there's no dialogue; `--blur 2` adds motion blur).
6. Inspect frames taken **from the MP4** (`ffmpeg -i out/<name>.mp4 -vf fps=1/1.5,scale=216:-1,tile=10x2 -frames:v 1 sheet.jpg`) and read `out/qc.txt`. Repair and re-render until clean.
7. Report the MP4, `out/render-metrics.json` (time, peak RAM, peak CPU), and what was checked.

## Guardrails

- Zero paid APIs by default. ElevenLabs needs `--allow-paid`, plus `allow_paid` in the brief, plus an environment key. Never print or store keys.
- Never publish. Renders run under `bin/bm-safe` (memory cap, CPU cores, low priority). Don't touch other services.
- Determinism: no `Math.random`, no clocks, no network during render (fonts, GSAP and three.js are vendored).
- Never put a `//` comment in the middle of a line of code. It disables the rest of the line.

## References

- **Sarcastic Grotesque** (face-first reaction-meme comedy, separate cast of 10 with 33 deforming expressions): `workflow/GROTESQUE.md`, `templates/grotesque`; agent: `bin/bm-agent "<brief>" --style grotesque --run`.
- **Library API:** `workflow/LIBRARY.md`. Visual catalog: `library/catalog`. Six-style showcase: `library/styles`.
- **Worked examples:** `templates/cartoon` (library demo with voice), `projects/crypto-crash` (2D comedy), `projects/aether-ad` (3D product ad).
- **Sound:** `tools/sound.py` (53 effects, 12 music styles, two-pass −14 LUFS).
- **Voice:** `tools/voice.py` (local Piper/LibriTTS-R, CC BY 4.0) and `tools/lipsync.py` (audio to visemes).
