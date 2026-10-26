# QA report: SlideSpoken 40 s YouTube ad

## Delivered
| File | What |
|---|---|
| `out/slidespoken-youtube-ad-40s.mp4` | 1920x1080, 30 fps, 1,200 frames, exactly 40.000 s; H.264 High, ~7.8 Mbps average (16 Mbps target); AAC-LC 48 kHz stereo (silent, for your voice and music); faststart |
| `out/slidespoken-youtube-ad-40s.srt` | 14 caption cues, same words and times as the burned-in captions |
| `out/slidespoken-storyboard.png` | 14 frames from the final render, two per scene |
| `out/slidespoken-thumbnail.png` | 1280x720 YouTube thumbnail |
| `out/slidespoken-hook-b-5s.mp4` | Alternative 5 s opening for A/B tests ("Your slides can answer back.") |
| `out/VOICEOVER-SCRIPT.md`, `out/ASSET-LICENSES.md` | Timed VO lines with sound cues; licence and claims manifest |
| `index.html`, `compositions/*.html`, `SPEC.md`, `thumbnail.html`, `variants/hook-b/` | Editable HyperFrames source |

## How it was made
SlideSpoken design system (tokens, type, voice) → `design-studio` routed the job to the Video lane → HyperFrames (HTML + GSAP, from the `hyperframes`, `hyperframes-cli` and `gsap-*` skills) → `hyperframes check` + `snapshot --review` → FFmpeg mux. Product states, labels and styles come from `ahmadscb/ai-presenter` (`agent-scroll-journey.tsx`, `codex-public.css`, `public/`). Remotion was installed but not used: the ad is web-native UI, which HyperFrames renders directly.

## Measured
- `hyperframes check`: 0 errors. Kept warnings, on purpose: `text_below_floor` (the product's own UI micro-copy at true proportions; every line the viewer must read is 30 px or more), `line_unread` on text that only exists inside a transition, `film_silent` (you add sound).
- ffprobe: 40.000 s, 1,200 video frames, 30/1, 1920x1080, AAC 48 kHz stereo.
- `blackdetect`: no black frames. The only flags are 34.3–35.3 s, the end card's dark band while the wordmark wipes in (content is on screen; checked by eye).
- `freezedetect`: four reading holds (16.5, 20.3, 25.8, 30.8 s) of 1.4–2.4 s where only the voice bars move. Intended: agenda, investor facts, the student's question and the AI's answer need the time.
- Spelling and copy checked against the brief's VO lines; product nouns capitalised as the brand book asks (AI Presenter, In-Person Mode, Agent Mode).

## Looked at (not measured)
Review sheets for every scene, every seam and phone width; the frames listed in SPEC.md's QA line. Fixed after review: logo over the eyebrow (6.5 s), Agent Mode zoom spilling over its label and cropping slide words (14.8 s), lesson question over the diagram (26.8 s), Q&A UI colliding with the flow strip (33.5 s), a 0.8 s empty dark gap before the end card's logo, a 22-word AI answer cut to 12 words so it can be read.

## Creative calls
- Display headlines are sentence case with one Gelasio-italic word, as the brand book requires; the brief's ALL-CAPS strings became sentence-case headlines, and uppercase stayed for DM Mono labels (SALES DEMOS, LIVE Q&A — BUILT IN). Easy to switch if you want caps.
- Georgia is not open-licensed, so Gelasio (its metric-compatible OFL twin) carries the italic turn.
- People are shown the way the product shows them (participant tiles with initials) and as silhouettes in the boardroom, not stock or generated faces: there was no licensed footage or image generator here, and invented photoreal people would weaken trust.
- The upload, mode choice and Q&A screens are rebuilds of the product's own marketing states at 1.6–2x so every label reads; the Agent Mode meeting is the real product screenshot.

## Not checked / open
- Nobody has heard it: there is no sound yet. Place the VO on the cue times in `VOICEOVER-SCRIPT.md`.
- The meeting icons are third-party marks shown as factual compatibility, as on slidespoken.com; have someone confirm you are comfortable showing them in paid ads.
- Weakest shot: the boardroom (9–12 s) is drawn, not filmed. With real footage of a room presentation it would land harder; drop a clip into `compositions/floor.html` (`#f-room`) and re-render.
