# Motion Studio pipeline: prompt to MP4

Each stage has one owner (the agent or a script) and one artefact, so another agent (Hermes, a scheduler, a human) can take over at any boundary.

| # | Stage | Owner | Artefact |
|---|---|---|---|
| 1 | **Creative brief** | agent | `projects/<name>/brief.json` (schema: `workflow/brief.template.json`) |
| 2 | **Style brief + storyboard** | agent, following the Bang Motion `SKILL.md` | `brief.json` → `style_brief`, `storyboard[]` (t0/t1, shot, camera, text, sfx, music) |
| 3 | **Scaffold** | `bin/bm-new <name> --dur N --template cartoon\|reel` | `projects/<name>/index.html` (bm-core + library, local GSAP/fonts) |
| 4 | **Visual assets** | agent | asset library first (`workflow/LIBRARY.md`: 10 characters, 9 sets, 17 props, 6 styles); new SVG only when missing; 3D via `lib/product3d.js` |
| 5 | **Animation** | agent | the GSAP timeline: stages + cameras, `BM.sfx()` and `BM.music()` cues next to the visual they belong to |
| 6 | **Dialogue / narration** (optional) | `tools/voice.py dialogue.json voice/` (characters, local) or `tools/narration.py` | `dialog.wav` + `dialog.json` (line timings + lip-sync visemes). ElevenLabs only with `--allow-paid` |
| 7 | **Key-frame QC** | `node tools/snap.mjs projects/<name> out/check t1 t2 …` | `sheet.jpg`. The agent **looks** at it: clipped or overlapping text, off-model character, slide feel, empty frames |
| 8 | **Render** | `bin/bm-render projects/<name> [--voice vo.wav] [--blur 2]` | `out/<name>.mp4`, `render-metrics.json` (resource-limited by `bin/bm-safe`) |
| 9 | **Video QC** | `tools/qc.sh` (run by bm-render) + agent inspects frames **from the MP4** | `qc.txt`. Spec, black/frozen frames, loudness (−14 LUFS) |
| 10 | **Repair loop** | agent | fix → 7 → 8 → 9 until clean |
| 11 | **Export** | done | MP4 H.264/AAC, yuv420p, +faststart. **Publishing is not wired** (human review first) |

## Rules the agent must keep

- **Determinism:** every frame is a function of `t`. No `Math.random` (use `BM.hash`), no clocks, no network at render time.
- **Rigs:** joints use `BM.J`. GSAP never touches a joint's `transform`. The placement group and the animated group are separate elements.
- **Vertical (9:16) layout:** stack the story (screen above character, character above desk) instead of side by side. Keep camera zoom ≥ 1.05.
- **Sound:** every visible action that needs a sound gets a `BM.sfx` cue at the same `t`. Music sections are named styles.
- **Comments:** never put a `//` comment in the middle of a line of code. It silently disables the rest of the line (this broke two renders during testing).

## Integrations (prepared, not enabled)

- **ElevenLabs:** `tools/narration.py --provider elevenlabs --allow-paid`, plus `narration.allow_paid: true` in the brief, plus `ELEVENLABS_API_KEY` in the environment.
- **Hermes / other agents:** write `brief.json`, then call `bin/bm-agent "<prompt>" --name X --run`, which runs headless Claude Code with a tool allowlist. Read `out/render-metrics.json` and `out/qc.txt`.
- **Instagram / TikTok:** deliver `out/<name>.mp4` (1080×1920, 30 fps, −14 LUFS). Auto-publishing is deliberately absent.
- **TOYA product ads:** start from `projects/aether-ad` (3D product + kinetic type). Swap the model for the real product (glTF) and the brand palette.
- **SlideSpoken explainers:** start from `projects/crypto-crash` (rig + expressions + stages). Bang Motion's explainer starters cover the 16:9 educational styles.
