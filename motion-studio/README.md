# Motion Studio: Bang Motion production setup

Natural-language prompt → storyboard → animation → sound → MP4, CPU-only, with zero paid services. Design rules come from **Bang Motion** (an installed Claude Code plugin); this folder adds the production layer: rendering, sound, QC and resource limits.

## 1. Installed component

| | |
|---|---|
| Plugin | `bang-motion@bang-motion` **v1.19.0**, user scope (`claude plugin marketplace add bangtutorial/bang-motion`, then `claude plugin install bang-motion@bang-motion --scope user`) |
| Commit | `c1aa65e921c970d858705fcb4a53a8294d1a4131` (2026-09-15). The installed copy is byte-identical to the audited clone |
| License | MIT (commercial use allowed; keep the copyright notice) |
| Studio skill | `skill/SKILL.md` → symlink to `~/.claude/skills/motion-studio` |

## 2. Security audit (Phase 1, done before anything ran)

The repository has 45 files: Markdown rules, 7 starter HTML pages, 7 scripts and images. There is no `package.json` at the root, no install hooks, no MCP server, no binaries.

- **Scripts read in full:**
  - `export-frames.mjs` and `snap.mjs` (Puppeteer screenshots)
  - `serve.py` (static server bound to 127.0.0.1)
  - `kepala-ekspresi.py` (local image edit)
  - `aset-svg.py`, `rig-tokoh.py` and `svg2png.cjs` (After Effects bridge helpers)
  - `vo-pauses.html` (local audio analysis)
  
  None reads credentials. Environment access is limited to `URL`, `FPS`, `OUT` and `SCALE`. There are no uploads or telemetry, no `eval` and no shell execution.
- **Outbound hosts referenced:** the CDNs for GSAP and three.js (cdnjs, jsDelivr), Google Fonts, and links in the docs. **Studio change:** GSAP 3.12.5, three.js r161 and the fonts are vendored locally, so renders make no network calls.
- **Prompt injection:** none found. `SKILL.md` steers toward one optional external service, the **Higgsfield MCP / After Effects bridge** (image generation and After Effects builds can cost credits). **It is not used.**
- **Dependencies:** `scripts/ae/bridge/package.json` asks for `puppeteer ^25` (unpinned caret). **Not installed.** The studio uses the pre-installed Playwright Chromium instead. `opencv-python` (for `kepala-ekspresi.py`) is also not needed.
- **Minor:** the starters' Puppeteer launch flags request a GPU (`--enable-gpu`). They are harmless on CPU, but the studio uses SwiftShader explicitly.

## 3. What Bang Motion does natively vs. what the studio adds

| Capability | Bang Motion | Studio |
|---|---|---|
| 2D cartoon characters | ✅ jointed vector rig (`J()`), walk/point/idle | Dave rig: big-head comedy proportions |
| Character consistency | ✅ one `character()` function reused | ✅ same `dave()` across stages and outfits |
| Facial expressions | ⚠️ 3 mouth swaps + blink (raster heads need a generator) | ✅ 9 vector presets: eye scale, pupils/$, lids, brows, 8 mouths, tears, sweat, blush, twitch |
| Body movement | ✅ joint rotations, walk cycle | pose helper, sips, waves, lean |
| Kinetic typography | ✅ (opener starter, techniques) | per-character blur/letter-space cascades, counters |
| Camera moves | ✅ per-stage camera, zoom ≥ 1.08 | shake, whips, ride-ups, 3D camera |
| Animated backgrounds | ✅ "≥10 moving things per stage" law | parallax, live chart, weather |
| VO sync | ⚠️ pause-finder page; manual sync | `tools/narration.py` per-line timings (Piper free / ElevenLabs gated) |
| Sound effects / music | ❌ plays a supplied file only | `tools/sound.py`: 35 synthesized effects, 7 music styles, two-pass −14 LUFS |
| Arabic / English type | ⚠️ not addressed (Latin docs) | works (proven in the SlideSpoken Arabic ads): IBM Plex Arabic, RTL, per-line timing |
| 9:16 vertical | ✅ "only when asked" | default; layouts redesigned for vertical |
| Full HD MP4 | ⚠️ PNG frames, 60 fps 16:9 hard-coded, `npm i puppeteer` | `tools/export.mjs`: any size/fps, piped to FFmpeg, CPU-only, measured |
| Quality checks | ✅ contact sheets (`snap.mjs`) | + `tools/qc.sh`: spec, black/frozen frames, loudness |

## 4. Commands

```bash
bin/bm-new <name> --size 1080x1920 --dur 20         # scaffold
node tools/snap.mjs projects/<name> /tmp/c 1 3 5    # key-frame contact sheet + cue list
bin/bm-render projects/<name> [--voice vo.wav]      # export (limited) → sound → mux → QC
bin/bm-agent "<prompt>" --name x [--run]            # headless Claude Code end-to-end (dry run by default)
python3 tools/narration.py brief.json out/          # optional voice (Piper; ElevenLabs needs --allow-paid)
```

Limits: `BM_MEM_MAX` (default 6G), `BM_CORES` (default nproc−1), `BM_TIMEOUT`. With systemd (a normal VPS), `bin/bm-safe` uses a transient scope with hard `MemoryMax` and `CPUQuota`. Otherwise it uses nice/ionice/taskset plus a memory watchdog.

## 5. Install on the VPS

```bash
git clone <this repo> && cd ahmad/motion-studio
claude plugin marketplace add bangtutorial/bang-motion && claude plugin install bang-motion@bang-motion --scope user
ln -sfn "$PWD/skill" ~/.claude/skills/motion-studio
sudo apt-get install -y ffmpeg && npm i -g playwright@1.63.0 && npx playwright install --with-deps chromium
pip install numpy scipy
BM_MEM_MAX=4G BM_CORES=2 bin/bm-render projects/crypto-crash     # verify on the VPS
```

## 6. Using it in a future conversation

Say: *"Use Motion Studio: make a 20-second 9:16 reel for … (brand, message, style)."* The `motion-studio` skill loads Bang Motion's rules and runs the pipeline in `workflow/PIPELINE.md`, ending in an inspected MP4 plus its metrics.
