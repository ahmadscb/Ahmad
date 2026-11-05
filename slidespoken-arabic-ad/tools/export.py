"""Frame-exact export (Bang Motion frame-exact, Python Playwright): every frame is seeked, captured, piped to ffmpeg.
   python3 tools/export.py out.mp4 [fps=30]"""
import sys, subprocess, pathlib, os
from playwright.sync_api import sync_playwright
OUT = sys.argv[1]; FPS = int(sys.argv[2]) if len(sys.argv) > 2 else 30
url = (pathlib.Path(__file__).resolve().parent.parent / "index.html").as_uri() + "?clean=1" + os.environ.get("Q", "")
ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-tune", "grain", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-r", str(FPS), "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1243/chrome-linux64/chrome")
    pg = b.new_page(viewport={"width": 1920, "height": 1080})
    pg.goto(url); pg.wait_for_function("window.AD && window.AD.ready")
    dur = pg.evaluate("window.AD.DURATION"); n = round(dur * FPS)
    for i in range(n):
        pg.evaluate("t=>{window.AD.seek(t)}", i / FPS)
        ff.stdin.write(pg.screenshot(type="png"))
        if i % FPS == 0: print(f"\r{i}/{n}", end="", flush=True)
    b.close()
ff.stdin.close(); ff.wait(); print("\ndone", OUT)
