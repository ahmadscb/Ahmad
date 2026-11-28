# Motion Studio v2: autonomous engine, test report (2026-11-28)

Test machine: cloud container, 4 vCPU, 16 GB RAM, no GPU. Renders were limited to 3 cores and a 6 GB memory cap (`bin/bm-safe`).

## 1. Autonomous test: `bm-agent --run`

- **Brief given (nothing else):** "Create a funny 30-second animated video about an employee who pretends to work whenever his manager walks past."
- **Command:** `bin/bm-agent "<brief>" --name employee-pretends --run`. It ran a headless Claude Code session with a tool allowlist; git, curl, rm and web access were denied.

The session handled every step itself. No manual work went into this video.

| Step | What the agent produced |
|---|---|
| Script and storyboard | `brief.json`: three gags following the rule of three (cat video, asleep, monitor slapped off), a CEO twist, and an end card |
| Characters | from the library: Dave (employee), Omar (manager), Rex (CEO) |
| Scene and props | office set, desk, chair, monitor with three screen states, mug, clock cards |
| Dialogue | `dialogue.json` → `tools/voice.py`: 9 voiced lines, local voices, lip-sync visemes |
| Animation | expressions, poses, walks, startles, snap zooms, subtitles, comic slam to the end card |
| Sound | 64 sound effects plus the `sneaky` music, mixed under the voice track |
| Inspection and repair | 4 key-frame inspection rounds plus frames checked from the MP4; 6 defects fixed (framing, wrong arm, pointing, leftover "?", hidden end-card characters, a crash in the sound step) |

**Agent session cost:**

- 50 turns, **779 s** wall time.
- Tool calls: 25 Bash, 12 Edit, 8 Read, 3 Write.
- Plan usage reported as `total_cost_usd` **3.03** (notional; it runs on the existing Claude plan, and no other paid API was called).

**Result:** `projects/employee-pretends/out/employee-pretends.mp4`.

- 1080×1920, 30 fps, 30.0 s, H.264/AAC.
- QC: no black frames, no frozen frames, −15.0 LUFS.

**Known weaknesses** (from my review of the frames):

- In the twist, Rex walks partly behind Omar, so the CEO is half hidden for about a second.
- The camera stays in one office set for most of the video.
- The loudness is 1 LU under target.

**Pipeline bug found by the agent and fixed in the library:** the `cricket` effect was silent at short durations.

## 2. Rendering performance (measured, from `render-metrics.json`)

| Render | Frames | Export wall time | Per frame | Peak RAM | Peak CPU |
|---|---|---|---|---|---|
| employee-pretends (2D, agent) | 900 | 68.6 s | 0.076 s | 787 MB | 198 % |
| six-style showcase (2D + 4 s of 3D) | 720 | 217.6 s | 0.30 s | 800 MB | 198 % |
| aether-ad (full 3D, earlier) | 540 | 439.1 s | 0.81 s | 828 MB | 198 % |
| cartoon 3 s test, no blur / `--blur 3` | 90 | 9.1 s / 23.2 s | 0.10 / 0.26 s | 766 / 871 MB | 198 % |

Sound, mux and QC add about 10–20 s per video. Voice synthesis takes about 2 s for 9 lines.

**One 30-second 2D reel costs about 1.5 minutes of rendering plus about 13 minutes of agent time.** Four reels a day is about 1 hour of machine time.

## 3. Reconciling the earlier 3D estimate

- I estimated about **3.4 s/frame (about 25 min)** for the aether 3D ad.
- The recorded export took **436 s for 540 frames = 0.81 s/frame (7.3 min)**, about **4.2× faster** than estimated.
- **Cause:** I read the estimate off progress counters printed once per second of video. Those were block-buffered through the pipe, so several counters arrived at once after long gaps. I divided the elapsed time at an early flush by too few frames, and the early frames also included shader compilation and environment-map setup.
- **Rule now:** quote only `render-metrics.json` (wall time measured by `bm-safe`), never progress output.

## 4. Limitations (honest)

- **2D vector puppets, not hand-drawn animation.** Movement is jointed rotation with easing, anticipation, overshoot and squash. It reads well, but it is not frame-by-frame character animation.
- **Motion blur is sub-frame averaging.** With 2–3 sub-frames it can look ghosted on very fast moves, and it multiplies render time.
- **Lip-sync uses five visemes**, derived from audio energy and spectrum. It's convincing at reel speed, but not phoneme-accurate.
- **Voices** are a single multi-speaker English model. Other languages need another Piper model. The credit line "Voices: LibriTTS-R (CC BY 4.0)" is required.
- **3D product ads** use parametric shapes (bottle, can, phone, watch, ring, box). A real product needs a glTF model.
- **Each video still costs about 13 minutes of Claude plan usage.**
- Agent quality varies between runs. The QC gate catches technical faults, not weak jokes, so **a human should review before anything is published**. Auto-publishing is deliberately absent.
- Nothing has been deployed to Contabo, because there is no authorized access. The install was tested in a sandbox. The Chromium download was blocked by the sandbox proxy, so the test used `--browsers-from`.
