"""Collect the sound cues the scenes register (HF.cue) from a running `hyperframes preview`, into audio/cues.json.
Usage: npx hyperframes preview --port 4567 &  then  python3 tools/cues.py http://localhost:4567"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright
OUT = pathlib.Path(__file__).resolve().parent.parent / "audio/cues.json"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1243/chrome-linux64/chrome"); pg = b.new_page()
    pg.goto(sys.argv[1]); pg.wait_for_timeout(8000)
    best = []
    for f in pg.frames:  # the preview iframe holds the composed film
        try: best = max(best, f.evaluate("window.HF ? window.HF.sfx : []"), key=len)
        except Exception: pass
    b.close()
assert best, "no cues found: is the preview running?"
json.dump(sorted(best, key=lambda c: c["t"]), open(OUT, "w"), indent=0); print(len(best), "cues ->", OUT)
