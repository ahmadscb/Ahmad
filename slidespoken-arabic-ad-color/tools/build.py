"""Build the HyperFrames project from the voice timings.
 - index.html: scene hosts timed to the voice, shared design tokens + slide styles, window.BEATS (line times per scene)
 - compositions/<scene>.html: from scenes/<scene>.html with {{slide:NAME}} snippets filled in
 - compositions/captions.html: one caption group per spoken line
Usage: python3 tools/build.py   (after ../slidespoken-arabic-ad/tools/voice_mix.py)"""
import json, pathlib, re, html
ROOT = pathlib.Path(__file__).resolve().parent.parent
T = json.load(open(ROOT / "voice/timings.json")); L = {l["id"]: l for l in T["lines"]}; DUR = T["total"]

# scene boundaries: each scene opens a little before its first spoken word
B = [0, L["s2a"]["start"] - .3, L["s3a"]["start"] - .5, L["s4a"]["start"] - .4, L["s5a"]["start"] - .3, L["s6a"]["start"] - .35, L["s7a"]["start"] - .6, DUR]
SCENES = ["hook", "upload", "room", "online", "qa", "report", "brand"]
scene = {sid: {"start": round(B[i], 3), "dur": round(B[i + 1] - B[i], 3)} for i, sid in enumerate(SCENES)}
BEATS = {"scene": scene, "lines": {l["id"]: {k: l[k] for k in ("start", "end", "marks", "pauses", "silent")} for l in T["lines"]}, "total": DUR}

SLIDES = {  # colourful Arabic decks; sized by the host's font-size (width / 48)
 "growth": """<div class="sl sl-growth"><div class="sl-band g-violet"><b class="sl-t">خطة النمو ٢٠٢٧</b><span class="sl-k">الإيرادات حسب الربع</span></div>
  <svg class="sl-line" viewBox="0 0 600 300" preserveAspectRatio="none"><defs><linearGradient id="{id}-lg" x1="0" x2="1"><stop offset="0" stop-color="#2e7d32"/><stop offset="1" stop-color="#9be010"/></linearGradient>
  <linearGradient id="{id}-la" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9be010" stop-opacity=".35"/><stop offset="1" stop-color="#9be010" stop-opacity="0"/></linearGradient></defs>
  <path class="area" d="M0 250 C120 230 170 190 250 170 S420 110 600 40 V300 H0 Z" fill="url(#{id}-la)"/><path class="ln" d="M0 250 C120 230 170 190 250 170 S420 110 600 40" fill="none" stroke="url(#{id}-lg)" stroke-width="10" stroke-linecap="round"/></svg>
  <div class="sl-kpis"><div class="kpi c-coral"><b>٣</b><span>أسواق جديدة</span></div><div class="kpi c-teal"><b>٥</b><span>شراكات</span></div><div class="kpi c-blue"><b>١٢</b><span>مدينة</span></div></div></div>""",
 "regions": """<div class="sl sl-regions"><b class="sl-t ink">نمو المبيعات حسب المنطقة</b><span class="sl-k">الربع الثالث ٢٠٢٦</span>
  <div class="rg"><div class="rg-r"><span>السعودية</span><i class="bar g-teal" style="width:64%"></i></div><div class="rg-r"><span>الإمارات</span><i class="bar g-blue" style="width:54%"></i></div>
  <div class="rg-r"><span>قطر</span><i class="bar g-violet" style="width:43%"></i></div><div class="rg-r"><span>الأردن</span><i class="bar g-coral" style="width:35%"></i></div></div></div>""",
 "plan": """<div class="sl sl-plan"><b class="sl-t ink">خطة التوسّع</b><span class="sl-k">٢٠٢٧</span><i class="pl-line"></i>
  <div class="pl-cards"><div class="pl c-teal"><i>١</i><b>الرياض</b><span>الربع الأول</span></div><div class="pl c-blue"><i>٢</i><b>الدوحة</b><span>الربع الثاني</span></div><div class="pl c-coral"><i>٣</i><b>عمّان</b><span>الربع الثالث</span></div></div></div>""",
 "prio": """<div class="sl sl-prio"><b class="sl-t ink">أهم الأولويات</b><span class="sl-k">الربع الجاي</span>
  <div class="pr"><div class="pr-c g-violet"><i>١</i>التوسّع بالسعودية والإمارات</div><div class="pr-c g-coral hot"><i>٢</i>فريق مبيعات جديد بالدوحة</div><div class="pr-c g-teal"><i>٣</i>إطلاق الخدمة بعمّان</div></div></div>""",
 "donut": """<div class="sl sl-donut"><b class="sl-t ink">قنوات المبيعات</b><span class="sl-k">توزيع الربع الثالث</span>
  <svg class="dn" viewBox="0 0 200 200"><circle cx="100" cy="100" r="70" fill="none" stroke="#eef1ea" stroke-width="34"/>
  <circle class="seg" cx="100" cy="100" r="70" fill="none" stroke="#14121f" stroke-width="34" pathLength="100" stroke-dasharray="46 100" transform="rotate(-90 100 100)"/>
  <circle class="seg" cx="100" cy="100" r="70" fill="none" stroke="#7cc614" stroke-width="34" pathLength="100" stroke-dasharray="30 100" stroke-dashoffset="-46" transform="rotate(-90 100 100)"/>
  <circle class="seg" cx="100" cy="100" r="70" fill="none" stroke="#d8ff73" stroke-width="34" pathLength="100" stroke-dasharray="24 100" stroke-dashoffset="-76" transform="rotate(-90 100 100)"/></svg>
  <div class="dn-l"><span><i style="background:#14121f"></i>مباشر</span><span><i style="background:#7cc614"></i>شركاء</span><span><i style="background:#d8ff73"></i>أونلاين</span></div></div>""",
 "agenda": """<div class="sl sl-agenda"><div class="sl-band g-teal"><b class="sl-t">أجندة الاجتماع</b><span class="sl-k">مراجعة المبيعات الفصلية</span></div>
  <div class="ag"><div><i class="c-violet">١</i>نتائج الربع الثالث</div><div><i class="c-coral">٢</i>خطة التوسّع</div><div><i class="c-blue">٣</i>الخطوات الجاية</div></div></div>""",
}

HEAD = r"""<!doctype html>
<html lang="ar">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<title>SlideSpoken Arabic Colour</title>
<script src="assets/gsap.min.js"></script>
<style>
@font-face{font-family:Plex;font-weight:400;src:url("assets/fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2") format("woff2");unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F}
@font-face{font-family:Plex;font-weight:500;src:url("assets/fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2") format("woff2");unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F}
@font-face{font-family:Plex;font-weight:600;src:url("assets/fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2") format("woff2");unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F}
@font-face{font-family:Plex;font-weight:700;src:url("assets/fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2") format("woff2");unicode-range:U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F}
@font-face{font-family:Plex;font-weight:500;src:url("assets/fonts/inter-latin-500-normal.woff2") format("woff2");unicode-range:U+0000-00FF,U+2000-206F,U+2190-21FF,U+2713}
@font-face{font-family:Plex;font-weight:600;src:url("assets/fonts/inter-latin-600-normal.woff2") format("woff2");unicode-range:U+0000-00FF,U+2000-206F,U+2190-21FF,U+2713}
@font-face{font-family:Plex;font-weight:700;src:url("assets/fonts/inter-latin-700-normal.woff2") format("woff2");unicode-range:U+0000-00FF,U+2000-206F,U+2190-21FF,U+2713}
@font-face{font-family:Plex;font-weight:400;src:url("assets/fonts/inter-latin-500-normal.woff2") format("woff2");unicode-range:U+0000-00FF,U+2000-206F,U+2190-21FF,U+2713}
@font-face{font-family:Mono;font-weight:500;src:url("assets/fonts/dm-mono-latin-500-normal.woff2") format("woff2")}
:root{--ink:#14121f;--muted:#6b6880;--lime:#d8ff73;--olive:#5e7d22;
 --violet:#6c4bff;--pink:#ff4fa0;--coral:#ff7a45;--amber:#ffb53d;--teal:#14c8b4;--blue:#2f6bff;--sky:#3fc6ff;--magenta:#e8338a;--green:#22c55e;
 --shadow:0 24px 70px rgba(20,18,31,.10),0 2px 8px rgba(20,18,31,.06)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1920px;height:1080px;overflow:hidden;background:#14121f}
#root{position:relative;width:100%;height:100%;font-family:Plex,sans-serif;color:var(--ink)}
/* colour worlds */
.world{position:absolute;inset:0}
.w-violet{background:radial-gradient(60% 45% at 50% 100%,rgba(216,255,115,.30),transparent 70%),radial-gradient(40% 40% at 8% 0%,rgba(216,255,115,.14),transparent 70%),#ffffff}
.w-coral{background:radial-gradient(60% 45% at 50% 100%,rgba(216,255,115,.30),transparent 70%),radial-gradient(40% 40% at 8% 0%,rgba(216,255,115,.14),transparent 70%),#ffffff}
.w-teal{background:radial-gradient(60% 45% at 50% 100%,rgba(216,255,115,.30),transparent 70%),radial-gradient(40% 40% at 8% 0%,rgba(216,255,115,.14),transparent 70%),#ffffff}
.w-blue{background:radial-gradient(60% 45% at 50% 100%,rgba(216,255,115,.30),transparent 70%),radial-gradient(40% 40% at 8% 0%,rgba(216,255,115,.14),transparent 70%),#ffffff}
.w-magenta{background:radial-gradient(60% 45% at 50% 100%,rgba(216,255,115,.30),transparent 70%),radial-gradient(40% 40% at 8% 0%,rgba(216,255,115,.14),transparent 70%),#ffffff}
.w-green{background:radial-gradient(60% 45% at 50% 100%,rgba(216,255,115,.30),transparent 70%),radial-gradient(40% 40% at 8% 0%,rgba(216,255,115,.14),transparent 70%),#ffffff}
.w-lime{background:radial-gradient(60% 45% at 50% 100%,rgba(216,255,115,.30),transparent 70%),radial-gradient(40% 40% at 8% 0%,rgba(216,255,115,.14),transparent 70%),#ffffff}
.dots{display:none;position:absolute;inset:0;background-image:radial-gradient(circle,rgba(20,18,31,.075) 1.4px,transparent 1.7px);background-size:26px 26px}
.g-violet{background:linear-gradient(120deg,#2e7d32,#4caf50)}.g-coral{background:linear-gradient(120deg,#4f8f0f,#7cc614)}.g-teal{background:linear-gradient(120deg,#14121f,#3a3d33)}.g-blue{background:linear-gradient(120deg,#5aa31a,#8ad41e)}.g-pink{background:linear-gradient(120deg,#6fb312,#9be010)}.g-green{background:linear-gradient(120deg,#16a34a,#7ee07a)}
.c-violet{--c:#2e7d32}.c-coral{--c:#7cc614}.c-teal{--c:#14121f}.c-blue{--c:#5aa31a}.c-pink{--c:#9be010}
/* type */
.hl{position:absolute;right:110px;top:70px;direction:rtl;font-weight:700;font-size:66px;line-height:1.2;color:var(--ink);white-space:nowrap}
.hl .w{display:inline-block}.hl mark{color:#7cc614;background:none}
.kick{position:absolute;right:112px;top:40px;font-family:Mono;font-weight:500;font-size:22px;letter-spacing:.16em;text-transform:uppercase;color:#6b6880;direction:ltr}
.card{position:absolute;background:#fff;border-radius:28px;box-shadow:var(--shadow)}
.pill{display:inline-flex;align-items:center;gap:10px;font-family:Mono;font-weight:500;font-size:18px;letter-spacing:.12em;text-transform:uppercase;padding:9px 18px;border-radius:999px;white-space:nowrap}
.av{border-radius:50%;display:grid;place-items:center;font-weight:700;color:#fff;flex:none}
/* slides */
.deckhost{position:absolute;overflow:hidden;border-radius:22px;background:#fff}
.sl{position:absolute;inset:0;direction:rtl;background:#fff;color:var(--ink);overflow:hidden}
.sl-t{display:block;font-weight:700;font-size:2.5em;line-height:1.2}.sl-t.ink{margin:5% 6% 0}
.sl-k{display:block;font-size:1.05em;opacity:.75;margin:.25em 6% 0}
.sl-band{position:absolute;left:0;right:0;top:0;height:30%;padding:4% 6% 0;color:#fff}.sl-band .sl-k{margin:.25em 0 0}
.sl-line{position:absolute;left:5%;width:52%;top:38%;height:52%}
.sl-kpis{position:absolute;right:5%;top:36%;width:34%;display:flex;flex-direction:column;gap:.7em}
.kpi{border-radius:.7em;padding:.55em .9em;background:color-mix(in srgb,var(--c) 14%,#fff);border-right:.35em solid var(--c);display:flex;align-items:baseline;gap:.6em}
.kpi b{font-size:2em;color:var(--c);font-weight:700;line-height:1}.kpi span{font-size:1.1em;font-weight:600}
.rg{position:absolute;right:6%;left:6%;top:34%;display:flex;flex-direction:column;gap:1.05em}
.rg-r{display:flex;align-items:center;gap:1em;font-size:1.25em;font-weight:600}.rg-r span{width:5em}
.rg .bar{display:block;height:1.35em;border-radius:.4em;transform-origin:100% 50%}
.pl-line{position:absolute;left:10%;right:10%;top:52%;height:.3em;border-radius:.2em;background:linear-gradient(270deg,#14121f,#5aa31a,#9be010);transform-origin:100% 50%}
.pl-cards{position:absolute;left:5%;right:5%;top:40%;display:flex;justify-content:space-between;direction:rtl}
.pl{width:28%;border-radius:.9em;background:#fff;box-shadow:0 .6em 1.6em rgba(20,18,31,.12);padding:.9em;text-align:center;border-top:.35em solid var(--c)}
.pl i{display:grid;place-items:center;width:2.2em;height:2.2em;margin:-2.1em auto .4em;border-radius:50%;background:var(--c);color:#fff;font-style:normal;font-weight:700;font-size:1.1em}
.pl b{display:block;font-size:1.5em}.pl span{font-size:1em;opacity:.7}
.pr{position:absolute;right:6%;left:6%;top:33%;display:flex;flex-direction:column;gap:.7em}
.pr-c{border-radius:.8em;color:#fff;font-size:1.45em;font-weight:600;padding:.55em .8em;display:flex;align-items:center;gap:.6em;width:72%}
.pr-c i{font-style:normal;width:1.6em;height:1.6em;border-radius:50%;background:rgba(255,255,255,.28);display:grid;place-items:center;font-size:.8em}
.dn{position:absolute;left:10%;top:28%;width:34%;height:62%}
.dn-l{position:absolute;right:8%;top:40%;display:flex;flex-direction:column;gap:.8em;font-size:1.35em;font-weight:600}.dn-l i{display:inline-block;width:.8em;height:.8em;border-radius:50%;margin-left:.5em}
.ag{position:absolute;right:6%;left:6%;top:38%;display:flex;flex-direction:column;gap:.8em;font-size:1.5em;font-weight:600}
.ag i{display:inline-grid;place-items:center;width:1.7em;height:1.7em;border-radius:50%;background:var(--c);color:#fff;font-style:normal;margin-left:.6em;font-size:.85em}
/* meeting window (shared by the online and Q&A scenes) */
.mwin{position:absolute;left:110px;top:170px;width:1700px;height:730px;border-radius:30px;background:#fff;border:1px solid #e9e8ef;box-shadow:var(--shadow);overflow:hidden}
.mwin .acc{position:absolute;left:0;right:0;top:0;height:8px;background:#00ac47}
.mbar{position:absolute;left:30px;right:30px;top:20px;height:52px;display:flex;align-items:center;gap:14px;direction:ltr}
.pf-box{position:relative;width:42px;height:42px}.pf{position:absolute;inset:0;width:42px}.pf.p1,.pf.p2{opacity:0}
.pn-box{position:relative;width:300px;height:32px}.pn{position:absolute;left:0;top:0;font-size:25px;font-weight:700;white-space:nowrap}.pn.p1,.pn.p2{opacity:0}
.mstate{font-family:Mono;font-size:17px;letter-spacing:.12em;color:var(--muted)}
.share{left:30px;top:80px;width:1100px;height:619px;font-size:22.92px;border:1px solid #ecebf2}
.share .dk{position:absolute;inset:0}.share .d2,.share .d3{opacity:0}
.sno{position:absolute;left:22px;bottom:16px;font-family:Mono;font-size:15px;letter-spacing:.12em;color:var(--muted)}
.mtile{position:absolute;left:1160px;width:510px;height:140px;border-radius:20px;background:#f7f6fb;border:2px solid #ecebf2;display:flex;align-items:center;gap:18px;padding:0 22px;direction:rtl}
.mtile b{font-size:28px;font-weight:700}.mtile small{display:block;font-family:Mono;font-size:15px;letter-spacing:.12em;color:var(--muted);direction:ltr;text-align:right}
.mwin .mtile:nth-of-type(1){top:80px}
.tai{top:80px;background:linear-gradient(120deg,#14121f,#2a2550);border:none;color:#fff}.tai small{color:#b9b4d6}
.mwin > .mtile:nth-child(5){top:232px}.mwin > .mtile:nth-child(6){top:384px}.mwin > .mtile:nth-child(7){top:536px}
.aim{width:76px;height:76px;border-radius:22px;background:var(--lime);display:flex;align-items:center;justify-content:center;gap:5px;flex:none}
.aim i{display:block;width:6px;height:36px;border-radius:3px;background:var(--ink)}
.spk{margin-right:auto;background:var(--lime);color:var(--ink);font-size:15px;padding:6px 12px}
/* AI orb */
.orb{position:absolute;width:300px;height:300px}
.orb-ball{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 34% 28%,#ffffff 0,#f6f7f4 42%,#dfe3dc 100%);box-shadow:inset -20px -26px 44px rgba(20,18,31,.09),0 34px 70px rgba(20,18,31,.18)}
.orb-visor{position:absolute;left:14%;right:14%;top:31%;height:40%;border-radius:46%/50%;background:radial-gradient(circle at 40% 35%,#2a2d27 0,#0b0c0a 70%);box-shadow:inset 0 0 26px rgba(216,255,115,.22),0 4px 10px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;gap:6%}
.orb-visor i{display:block;width:5%;height:62%;border-radius:999px;background:#c8ff4d;box-shadow:0 0 12px rgba(200,255,77,.9)}
.orb-glow{position:absolute;left:-20%;right:-20%;bottom:-26%;height:34%;border-radius:50%;background:radial-gradient(closest-side,rgba(190,255,60,.55),transparent);filter:blur(6px)}
.orbit{position:absolute;overflow:visible;pointer-events:none}
.orbit ellipse{fill:none;stroke:#b6f53a;stroke-width:14;stroke-linecap:round;filter:drop-shadow(0 0 10px rgba(182,245,58,.9)) drop-shadow(0 0 24px rgba(182,245,58,.55))}
.glass{background:#fff;border:1px solid #eef0ea;box-shadow:0 30px 60px rgba(20,18,31,.10),0 0 0 1px rgba(255,255,255,.6) inset}
.cta-pill{display:flex;align-items:center;gap:22px;padding:14px 34px 14px 16px;border-radius:999px;background:#0d0e0c;color:#fff;font-weight:700;box-shadow:0 0 0 3px rgba(182,245,58,.35),0 20px 50px rgba(20,18,31,.25),0 0 40px rgba(182,245,58,.35)}
.cta-pill .play{width:70px;height:70px;border-radius:50%;background:#b6f53a;display:grid;place-items:center;flex:none}
/* captions */
.cap{position:absolute;left:0;right:0;top:978px;display:flex;justify-content:center}
.cap p{direction:rtl;unicode-bidi:isolate;padding:8px 28px 11px;border-radius:999px;background:#0d0e0c;box-shadow:0 10px 30px rgba(20,18,31,.18);color:#fff;font-size:38px;font-weight:600;line-height:1.4;white-space:nowrap}
</style>
<script>
window.BEATS = __BEATS__;
window.HF = {
  // a line's [start, end] and word marks in the scene's own time
  line(scene, id) { const B = window.BEATS, o = B.scene[scene].start, l = B.lines[id], m = {};
    for (const k in l.marks) m[k] = l.marks[k] - o; return { s: l.start - o, e: l.end - o, marks: m, pauses: l.pauses.map(p => [p[0] - o, p[1] - o]) }; },
  dur(scene) { return window.BEATS.scene[scene].dur; },
  words(el) { if (!el || el.dataset.split) return; el.dataset.split = 1;
    el.innerHTML = [...el.childNodes].map(n => n.nodeType === 3 ? n.textContent.split(/(\s+)/).map(w => w.trim() ? `<span class="w">${w}</span>` : w).join("") : `<span class="w">${n.outerHTML}</span>`).join(""); },
  // voice-reactive bar heights for a scene-local time (closed form, seek-safe)
  bars(els, t, scene, amp) { const env = window.BEATS.env, i = Math.round((t + window.BEATS.scene[scene].start) * 30), e = env[Math.max(0, Math.min(env.length - 1, i))] || 0;
    els.forEach((b, k) => { const m = .3 + .7 * Math.abs(Math.sin(k * 1.9 + t * 9) * .6 + Math.sin(k * .7 - t * 5) * .4); b.style.transform = `scaleY(${(.15 + .85 * Math.min(1, e * 1.2) * m) * amp})`; }); },
  sfx: [], cue(scene, t, type, dur = .5, gain = 1) { this.sfx.push({ t: +(t + window.BEATS.scene[scene].start).toFixed(3), type, dur, gain }); }
};
window.__timelines = window.__timelines || {};
</script>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="__DUR__" data-width="1920" data-height="1080">
__HOSTS__
  <audio id="mix" class="clip" src="assets/mix.wav" data-start="0" data-duration="__DUR__" data-track-index="9"></audio>
</div>
<script>window.__timelines["main"] = gsap.timeline({ paused: true });</script>
</body>
</html>
"""

def slide(name, sid):
    return SLIDES[name].replace("{id}", sid)

BEATS["env"] = json.loads(open(ROOT / "timings.js").read().split("=", 1)[1].rstrip(";\n"))["env"]
hosts = "\n".join(f'  <div id="{s}" data-composition-id="{s}" data-composition-src="compositions/{s}.html" data-start="{scene[s]["start"]}" data-duration="{scene[s]["dur"]}" data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>' for s in SCENES)
hosts += f'\n  <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{DUR}" data-track-index="2" data-track-kind="captions" data-width="1920" data-height="1080" style="z-index:50"></div>'
(ROOT / "index.html").write_text(HEAD.replace("__BEATS__", json.dumps(BEATS, ensure_ascii=False)).replace("__DUR__", str(DUR)).replace("__HOSTS__", hosts))

for src in sorted((ROOT / "scenes").glob("*.html")):
    n = [0]
    def fill(m):
        n[0] += 1; return slide(m.group(1), f"{src.stem}-{m.group(1)}-{n[0]}")
    text = re.sub(r"\{\{part:(\w+)\}\}", lambda m: (ROOT / f"scenes/_{m.group(1)}.part").read_text(), src.read_text())  # shared markup (e.g. the meeting window)
    (ROOT / "compositions" / src.name).write_text(re.sub(r"\{\{slide:(\w+)\}\}", fill, text))

caps = [l for l in T["lines"] if not l["silent"]]
groups = "\n".join(f'    <div class="cap clip" id="cap-{l["id"]}" data-start="{round(l["start"] - .05, 3)}" data-duration="{round(l["end"] - l["start"] + .25, 3)}"><p>{html.escape(l["sub"])}</p></div>' for l in caps)
(ROOT / "compositions/captions.html").write_text(f"""<template>
  <style>#root{{position:absolute;inset:0;pointer-events:none}}</style>
  <div id="root" data-composition-id="captions" data-width="1920" data-height="1080">
{groups}
  </div>
  <script>(() => {{ const tl = gsap.timeline({{ paused: true }});
    document.querySelectorAll('[data-composition-id="captions"] .cap').forEach(c => {{ const s = +c.dataset.start, d = +c.dataset.duration;
      tl.fromTo(c.firstElementChild, {{ opacity: 0, filter: "blur(6px)" }}, {{ opacity: 1, filter: "blur(0px)", duration: .16, ease: "power3.out" }}, s);
      tl.to(c.firstElementChild, {{ opacity: 0, duration: .12, ease: "power2.in" }}, s + d - .14); }});
    window.__timelines["captions"] = tl; }})();</script>
</template>
""")
print("scenes", {k: (v["start"], v["dur"]) for k, v in scene.items()}, "total", DUR)
