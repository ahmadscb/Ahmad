"""Builds the 1080x1920 YouTube Shorts cut from the finished 16:9 ad: brand frame + film panel + large captions."""
import functools, http.server, pathlib, re, subprocess, threading
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
HERE = ROOT / "shorts"
SRC = ROOT / "out/slidespoken-youtube-ad-40s-final.mp4"
OUT = ROOT / "out/slidespoken-shorts-1080x1920.mp4"

# 1. the static frame, rendered from frame.html
http.server.SimpleHTTPRequestHandler.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8771), functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1243/chrome-linux64/chrome")
    pg = b.new_page(viewport={"width": 1080, "height": 1920})
    pg.goto("http://127.0.0.1:8771/shorts/frame.html"); pg.wait_for_timeout(800)
    pg.screenshot(path=str(HERE / "frame.png")); b.close()
srv.shutdown()

# 2. large captions from the ad's own SRT, in the band under the film
srt = (ROOT / "out/slidespoken-youtube-ad-40s.srt").read_text()
def t(s): h, m, rest = s.split(":"); sec, ms = rest.split(","); return f"{int(h)}:{m}:{sec}.{ms[:2]}"
events = [f"Dialogue: 0,{t(a)},{t(b)},Cap,,0,0,0,,{txt.strip()}" for a, b, txt in re.findall(r"(\S+) --> (\S+)\n(.+?)\n", srt + "\n")]
assert len(events) == 14, len(events)
(HERE / "captions.ass").write_text("""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter ExtraBold,64,&H00FFFFFF,&H00FFFFFF,&H00111611,&H00111611,0,0,0,0,100,100,-1,0,1,0,0,8,90,90,1215,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(events) + "\n")

# 3. film panel: drop the 16:9 burned-in caption band (y > 880), scale to 1180 wide, crop the empty sides to 1000
vf = ("[1:v]crop=1920:880:0:0,scale=1180:-2,crop=1000:540:90:0[film];"
      f"[0:v][film]overlay=40:600,subtitles={HERE / 'captions.ass'}:fontsdir={HERE / 'fonts'},format=yuv420p[v]")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", "30", "-i", str(HERE / "frame.png"), "-i", str(SRC),
                "-filter_complex", vf, "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow",
                "-b:v", "12M", "-maxrate", "16M", "-bufsize", "24M", "-r", "30", "-c:a", "copy", "-t", "40", "-movflags", "+faststart", str(OUT)], check=True)
print(OUT)
