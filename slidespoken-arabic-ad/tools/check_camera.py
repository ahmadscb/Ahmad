"""Self-check: frame-by-frame playback (what export.py does) must put the camera where a direct seek does
(what snap.py shows). Catches overlapping camera tweens. Usage: python3 tools/check_camera.py"""
import pathlib, re, sys
from playwright.sync_api import sync_playwright
url = (pathlib.Path(__file__).resolve().parent.parent / "index.html").as_uri() + "?clean=1&nosubs=1"
TF = "document.getElementById('world').style.transform"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1243/chrome-linux64/chrome")
    pg = b.new_page(viewport={"width": 1920, "height": 1080}); pg.goto(url); pg.wait_for_function("window.AD && window.AD.ready")
    seq = pg.evaluate(f"()=>{{let o={{}};const n=Math.round(AD.DURATION*30);for(let i=0;i<n;i++){{AD.seek(i/30);if(i%30==0)o[i]={TF}}};return o}}")
    bad = []
    for i, v in seq.items():
        j = pg.evaluate(f"t=>{{AD.seek(t);return {TF}}}", int(i) / 30)
        if max(abs(float(x) - float(y)) for x, y in zip(re.findall(r"-?[\d.]+", v), re.findall(r"-?[\d.]+", j))) > 0.5: bad.append(int(i) / 30)
    b.close()
print("camera mismatches at:", bad or "none"); sys.exit(1 if bad else 0)
