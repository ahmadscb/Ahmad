# SlideSpoken: Arabic ad, cinematic chalkboard (61 s, 1920×1080, 30 fps)

The idea in one line: **you no longer have to deliver every presentation yourself.**

## Deliverables

| File | What |
|---|---|
| `out/slidespoken-arabic-ad-1080p.mp4` | Final video: H.264 + AAC 48 kHz stereo, 1920×1080, 30 fps, Arabic subtitles burned in |
| `out/subtitles-ar.srt` | Arabic subtitles (SRT, same timing as the burned-in ones) |
| `audio/voiceover.mp3` / `voice/voiceover.wav` | Arabic voiceover on its own |
| `audio/music.wav`, `audio/sfx.wav`, `audio/mix.wav` | Music bed, sound effects, final mix |
| `NARRATION-SCRIPT.md` | Final Arabic script with per-line timings |
| `ELEVENLABS-SCRIPT.md` | The same script prepared for a premium voice (optional swap) |
| `index.html` + `assets/` + `timings.js` | Editable animation source (open in Chrome; it autoplays and loops) |

## Scenes

1. **0–4 s, hook.** A chalk presenter stands at a screen. The camera rushes the screen and the presenter turns to chalk dust. The slide keeps presenting, and an AI waveform appears. No logo yet.
2. **4–15.6 s, upload.** The logo is revealed in chalk, then PowerPoint and PDF cards (each pulses as it is spoken). Both fly into the "ارفع البرزنتيشن" upload box. The box becomes the live presenter interface, drawn in chalk and in Arabic, with the product's real layout: LIVE tag, outline rail, slide, AI transcript and controls. Waveforms follow the voice.
3. **15.6–23.1 s, in person.** A chalk boardroom in one-point perspective. The agent presents Arabic slides on the wall screen, and the slides advance on their own.
4. **23.1–33.6 s, online.** The camera pushes through the room screen, and the same slide becomes the shared screen of an online meeting. The AI Presenter joins, and the platform switches **Google Meet → Microsoft Teams → Zoom** exactly as each name is spoken (official icons). The deck advances.
5. **33.6–41.3 s, Q&A.** A participant asks "ممكن توضح هاي النقطة؟". The presentation pauses, the bullet it is about lights up, and the answer is built from that bullet. Then "Resuming presentation ✓". The status copy is the product's own.
6. **41.3–50.9 s, summary + email.** The meeting window morphs into the **Meeting Summary Report** (Key points / Decisions / Action items / Q&A, the real email's rows). The report folds into an envelope and arrives in the inbox as **"Meeting Summary — {meeting title}"** from SlideSpoken, with the PDF attached. This is the product's real subject line, used here instead of the brief's suggestion.
7. **50.9–61.3 s, brand.** Every stroke streams into the logo. The tagline follows, then "جرّب الخدمة مجاناً" + "بدون بطاقة ائتمان" + SlideSpoken.com (the site's own "Start free · No credit card required"; no unlimited-use claim).

## Rebuild

```bash
python3 tools/tts.py <ar_JO-kareem-medium.onnx>    # voice/lines/*.wav (Piper, offline). LS=0.73 sets the pace
python3 tools/voice_mix.py                          # timeline -> voice/voiceover.wav, timings.js, out/subtitles-ar.srt
python3 tools/asr_check.py <whisper-small dir>      # optional: transcribe each line back (pronunciation QC)
python3 tools/snap.py out/snap 2 12 24 36 48 58     # key-frame contact sheet
python3 tools/export.py out/video-silent.mp4 30     # frame-exact render
python3 tools/sound.py                              # music + sfx from the animation's cue list, final mix
ffmpeg -i out/video-silent.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/slidespoken-arabic-ad-1080p.mp4
```

**Swapping in another voice:** save one file per line as `voice/lines/<id>.wav` (ids are in `voice/lines.json`), then run `voice_mix.py`, `export.py` and `sound.py`. Every scene, subtitle and sound cue re-times itself to the new voice.

## Tools and services

- **Animation:** hand-written HTML/SVG/Canvas + GSAP 3.12.5 (local file). The chalk look is SVG turbulence and displacement filters. Dust is deterministic particles. Strokes draw on via dash offsets. This replaces Remotion: same programmable approach, already proven in this repo, no extra install.
- **Render:** Playwright (pre-installed Chromium) seeks every frame, then FFmpeg (libx264 `-tune grain`, AAC).
- **Voice:** Piper TTS, `ar_JO-kareem-medium` (a Jordanian Arabic male voice, open-source, offline, from the sherpa-onnx GitHub release). No paid service or credits used.
- **QC:** offline Whisper-small (sherpa-onnx) transcribes each line back.
- **Music and SFX:** synthesised from scratch in Python (NumPy/SciPy). No samples, no licences.
- **Fonts:** IBM Plex Sans Arabic (OFL) and DM Mono (OFL), via @fontsource.
- **Brand:** official SlideSpoken logo and app icon from the existing repo assets. Product screens are redrawn in Arabic chalk; they follow the real product's layout and are illustrative, not captures. Google Meet, Microsoft Teams and Zoom are shown with their official icons, unmodified, as "works with" identification only.
