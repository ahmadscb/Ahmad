"""Key-frame check (key frames, Python Playwright): python3 tools/snap.py OUTDIR 1 3.5 8 ..."""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True); times = [float(x) for x in sys.argv[2:]]
url = pathlib.Path(os.environ.get("PAGE", pathlib.Path(__file__).resolve().parent.parent / "index.html")).resolve().as_uri() + "?clean=1"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1243/chrome-linux64/chrome")
    pg = b.new_page(viewport={"width": 1920, "height": 1080})
    pg.on("pageerror", lambda e: print("PAGEERROR", e))
    pg.goto(url); pg.wait_for_function("window.AD && window.AD.ready")
    shots = []
    for t in times:
        pg.evaluate("t=>{window.AD.seek(t)}", t); pg.wait_for_timeout(60); pg.evaluate("t=>{window.AD.seek(t)}", t)
        f = out / f"t{t:05.2f}.png"; pg.screenshot(path=str(f)); shots.append((t, f))
    b.close()
tw, th = 480, 270; cols = min(4, len(shots)); rows = (len(shots) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (tw + 8), rows * (th + 30)), (40, 40, 40)); d = ImageDraw.Draw(sheet)
for i, (t, f) in enumerate(shots):
    x, y = (i % cols) * (tw + 8), (i // cols) * (th + 30)
    sheet.paste(Image.open(f).convert("RGB").resize((tw, th)), (x, y)); d.text((x + 4, y + th + 6), f"{t:.2f}s", fill=(255, 255, 0))
sheet.save(out / "sheet.jpg", quality=85); print(out / "sheet.jpg")
