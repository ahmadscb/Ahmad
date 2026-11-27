---
name: motion-studio
description: Produce finished MP4 motion graphics from a natural-language request - funny 2D cartoon shorts with consistent characters, premium product ads (3D product + kinetic type), explainers, Instagram/TikTok reels (1080x1920) and 16:9 videos - using the Bang Motion design rules plus Motion Studio's render, sound and QC pipeline. Use when the person asks for an animated video, reel, ad, cartoon, explainer or motion graphic as an MP4, or mentions Motion Studio / Bang Motion production.
---

# Motion Studio

The studio lives at `motion-studio/` in the `ahmadscb/ahmad` repository (VPS: wherever it is cloned). Design rules come from the **bang-motion** plugin skill. Read its `SKILL.md` (anti-PPT laws, style brief, camera) and, for characters, `references/kartun-panggung.md`. This skill adds production: rendering, sound, QC and limits.

## Workflow (do all of it; never stop at a storyboard)

1. Write `projects/<name>/brief.json` (schema `workflow/brief.template.json`): format, type, brand, message, style brief, shot-by-shot storyboard with times, sfx and music.
2. Run `bin/bm-new <name> --size 1080x1920 --dur <s>`, then build `index.html` on `lib/bm-core.js`. Use stages with their own cameras, `BM.J` rigs, `BM.sfx` / `BM.music` cues, and `BM.everyFrame` for anything computed per frame. 3D: import `three` through an importmap from `vendor/three` (see `projects/aether-ad`).
3. Run `node tools/snap.mjs projects/<name> /tmp/check <times…>` and **look at `sheet.jpg`**. Fix clipped or overlapping text, off-model characters, empty or slide-like frames, and props hidden behind other layers. Repeat.
4. Run `bin/bm-render projects/<name>` (add `--voice vo.wav` for narration from `tools/narration.py`).
5. Inspect frames taken **from the MP4** (`ffmpeg -i out/<name>.mp4 -vf fps=1/1.5,scale=216:-1,tile=10x2 -frames:v 1 sheet.jpg`) and read `out/qc.txt`. Repair and re-render until clean.
6. Report the MP4, `out/render-metrics.json` (time, peak RAM, peak CPU), and what was checked.

## Guardrails

- Zero paid APIs by default. ElevenLabs needs `--allow-paid`, plus `allow_paid` in the brief, plus an environment key. Never print or store keys.
- Never publish. Renders run under `bin/bm-safe` (memory cap, CPU cores, low priority). Don't touch other services.
- Determinism: no `Math.random`, no clocks, no network during render (fonts, GSAP and three.js are vendored).
- Never put a `//` comment in the middle of a line of code. It disables the rest of the line.

## References

- Worked examples: `projects/crypto-crash` (2D comedy, rig + 9 expressions, 7 scenes), `projects/aether-ad` (3D product ad).
- Sound: `tools/sound.py` (35 effects, 7 music styles, two-pass −14 LUFS).
