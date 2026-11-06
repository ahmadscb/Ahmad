# SlideSpoken: Arabic ad, light edition (1920×1080, 30 fps)

This is the white, brand-colour version of the Arabic ad, made to compare with the chalkboard edition in `../slidespoken-arabic-ad`. It uses the same story, the same voiceover (your ElevenLabs take) and the same timings, so the two films stay in sync.

- **Look:** the SlideSpoken brand system. Off-white canvas (#f8f8f6) with a light dot grid, ink (#111311), lime (#d8ff73) accents, olive (#5e7d22) labels, white cards with soft shadows. Type is IBM Plex Sans Arabic, plus Inter and DM Mono for Latin.
- **Clarity:** each scene has one product picture and one headline. A four-step tracker under the logo (ارفع ← بيقدّم ← بيجاوب ← بيبعتلك الملخص) shows where the viewer is in the journey.
- **Scenes:**
  1. Hook: the presenter steps away and the AI presents.
  2. Upload a PPTX or PDF, which becomes the live presenter screen.
  3. A boardroom wall screen.
  4. A match cut into the online meeting, where Google Meet, Teams and Zoom switch on the spoken names.
  5. Q&A answered from the highlighted bullet.
  6. The meeting becomes a Summary Report, which arrives as an email.
  7. Logo, tagline and the "جرّب الخدمة مجاناً" CTA.

## Build (tools live in the chalk project)

```bash
cd ../slidespoken-arabic-ad
export PAGE=../slidespoken-arabic-ad-light/index.html AUD=../slidespoken-arabic-ad-light/audio
python3 tools/check_camera.py
python3 tools/snap.py ../slidespoken-arabic-ad-light/out/snap 2 12 24 36 48
python3 tools/sound.py      # this film's own cue list -> audio/mix.wav
python3 tools/export.py ../slidespoken-arabic-ad-light/out/video-voice.mp4 30
```

The voice timing comes from `../slidespoken-arabic-ad/voice/take.json` and `tools/voice_mix.py`. Re-run that first if the voiceover changes, and both films re-time together.
