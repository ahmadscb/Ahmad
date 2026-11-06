"""Sound design for the SlideSpoken Arabic ad, synthesized from scratch (no samples, no licences needed).
Reads the cue list the animation exposes (window.AD.SFX) so every effect sits on its visual, then builds:
  audio/music.wav  original minimal tech bed (D minor, 100 bpm), arranged to the scenes
  audio/sfx.wav    chalk, eraser, whooshes, UI, email chime, brand impact
  audio/mix.wav    voice + ducked music + sfx, loudness-normalised (-14 LUFS, -1.5 dBTP)
  audio/music-sfx-bed.wav  the same without voice (-20 LUFS bed) for a voice recorded later
Usage: python3 tools/sound.py"""
import json, os, pathlib, subprocess, numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(os.environ.get("PROJ", pathlib.Path(__file__).resolve().parent.parent)).resolve()  # project whose voice/ timings to score
PAGE = pathlib.Path(os.environ.get("PAGE", ROOT / "index.html")).resolve()  # which film's cue list to score
AUD = pathlib.Path(os.environ.get("AUD", ROOT / "audio")).resolve()
SR = 48000
T = json.load(open(ROOT / "voice/timings.json")); DUR = T["total"]; N = int(DUR * SR)
rng = np.random.default_rng(20261105)

if os.environ.get("CUES"):  # a cue list exported by the film itself (e.g. HyperFrames scenes)
    CUES = json.load(open(os.environ["CUES"]))
else:
  with sync_playwright() as p:  # the cue list is owned by the animation
    b = p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1243/chrome-linux64/chrome")
    pg = b.new_page(viewport={"width": 1920, "height": 1080}); pg.goto(PAGE.as_uri() + "?clean=1")
    pg.wait_for_function("window.AD && window.AD.ready"); CUES = pg.evaluate("window.AD.SFX"); b.close()
AUD.mkdir(parents=True, exist_ok=True); json.dump(CUES, open(AUD / "sfx-cues.json", "w"), indent=0)

def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], "bandpass", fs=SR, output="sos"), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, "lowpass", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "highpass", fs=SR, output="sos"), x)
def tt(d): return np.arange(int(d * SR)) / SR
def env(d, a=.01, r=.2):
    n = int(d * SR); e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    e[:na] = np.linspace(0, 1, na); e[n - nr:] *= np.linspace(1, 0, nr); return e
def noise(d): return rng.standard_normal(int(d * SR))
def norm(x, peak=1.0): m = np.max(np.abs(x)) + 1e-9; return x / m * peak
def hz(n): return 440 * 2 ** ((n - 69) / 12)
IR = np.exp(-tt(1.9) * 3.4) * rng.standard_normal(int(1.9 * SR)); IR = lp(IR, 5200); IR /= np.sqrt(np.sum(IR ** 2))
def verb(x, wet=.25): return x + wet * fftconvolve(x, IR)[: len(x)]

# ---------------- effects ----------------
def chalk(d):
    x = np.zeros(int(d * SR)); t = 0.0
    while t < d - .05:  # individual strokes with a gritty scratch
        L = rng.uniform(.07, .26); s = int(t * SR); n = min(int(L * SR), len(x) - s)
        g = bp(noise(L), 1800, 7500)[:n] * (rng.random(n) > .55) * np.sin(np.linspace(0, np.pi, n)) ** .7
        x[s:s + n] += g * rng.uniform(.5, 1); t += L + rng.uniform(.01, .06)
    return norm(x, .32)
def erase(d): x = lp(bp(noise(d), 250, 2600), 2200) * np.sin(np.linspace(0, np.pi, int(d * SR))) ** 1.2; return norm(x, .45)
def whoosh(d):
    n = int(d * SR); x = noise(d); out = np.zeros(n); seg = 2048
    for i in range(0, n, seg):  # sweeping band
        f = 300 + 2600 * np.sin(np.pi * i / n) ** 2; out[i:i + seg] = bp(x[max(0, i - 4096):i + seg], f * .6, min(f * 1.6, 20000))[-len(out[i:i + seg]):]
    return norm(out * np.sin(np.linspace(0, np.pi, n)) ** 2, .5)
def dust(d): return norm(hp(noise(d), 4000) * env(d, .3, d * .7) ** 2, .16)
def tone(f, d, decay=6, h=(1, .3, .1)):
    t = tt(d); return sum(a * np.sin(2 * np.pi * f * (k + 1) * t) for k, a in enumerate(h)) * np.exp(-t * decay)
def click(d=.06): return norm(tone(1300, .06, 60) + .5 * tone(3100, .06, 90), .35)
def tick(d):  # progress-bar ticks
    x = np.zeros(int(d * SR)); y = tone(2400, .03, 120)
    for s in (np.arange(0, d - .03, .075) * SR).astype(int): x[s:s + len(y)] += y[: len(x) - s]
    return norm(x, .18)
def ui(d=.3): x = np.zeros(int(.32 * SR)); a = tone(hz(88), .2, 18); b2 = tone(hz(95), .2, 16); x[:len(a)] += a; x[int(.08 * SR):int(.08 * SR) + len(b2)] += b2; return norm(x, .25)
def slide(d): return norm(lp(bp(noise(d), 600, 4000), 3000) * np.sin(np.linspace(0, np.pi, int(d * SR))) ** 3, .22)
def digital(d):
    t = tt(d); f = 500 + 1800 * t / d; x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (np.sin(2 * np.pi * 22 * t) > 0) * env(d, .05, .3)
    return norm(lp(x, 5000) + .3 * whoosh(d), .3)
def join(d=.5): x = np.zeros(int(.7 * SR)); a = tone(hz(81), .5, 7); b2 = tone(hz(88), .5, 6); x[:len(a)] += a; x[int(.11 * SR):int(.11 * SR) + len(b2)] += b2; return norm(x, .3)
def pop(d=.3): t = tt(.18); return norm(np.sin(2 * np.pi * (500 + 900 * t) * t) * np.exp(-t * 28), .25)
def morph(d): t = tt(d); return norm(.6 * whoosh(d) + .4 * np.sin(2 * np.pi * np.cumsum(220 + 440 * t / d) / SR) * env(d, .2, .4), .4)
def ding(d=1.2):
    t = tt(1.6); x = np.zeros(len(t))
    for st, f in ((0, hz(91)), (.12, hz(96))):
        s = int(st * SR); y = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * dk) for m, a, dk in ((1, 1, 3.2), (2.76, .25, 6), (5.4, .08, 9))); x[s:] += y[: len(x) - s]
    return norm(x, .42)
def rise(d): t = tt(d); return norm(hp(noise(d), 1200) * (t / d) ** 2.5 * .5 + np.sin(2 * np.pi * np.cumsum(200 + 900 * (t / d) ** 2) / SR) * (t / d) ** 3 * .4, .35)
def reveal(d): t = tt(d); return norm(sum(np.sin(2 * np.pi * hz(n) * t) * np.exp(-t * 2.5) * (t > o) for n, o in ((74, 0), (81, .12), (86, .24))) * env(d, .02, .5) + .2 * dust(d), .32)
def impact(d):
    t = tt(d); boom = np.sin(2 * np.pi * np.cumsum(38 + 50 * np.exp(-t * 8)) / SR) * np.exp(-t * 2.6)
    return norm(boom + .35 * lp(noise(d), 900) * np.exp(-t * 7) + .25 * tone(hz(62), d, 1.5), .75)
def shimmer(d):
    t = tt(d); x = np.zeros(len(t))
    for i, n in enumerate((74, 78, 81, 86, 90)):
        s = int(i * .13 * SR); y = np.sin(2 * np.pi * hz(n) * t) * np.exp(-t * 1.6); x[s:] += y[: len(x) - s]
    return norm(x * env(d, .01, .8), .3)
FX = dict(chalk=chalk, erase=erase, whoosh=whoosh, dust=dust, click=click, tick=tick, ui=ui, slide=slide, digital=digital, join=join, pop=pop, morph=morph, ding=ding, rise=rise, reveal=reveal, impact=impact, shimmer=shimmer)
LEVEL = dict(chalk=.55, erase=.6, whoosh=.7, dust=.6, click=.6, tick=.5, ui=.55, slide=.6, digital=.5, join=.6, pop=.55, morph=.6, ding=.8, rise=.7, reveal=.7, impact=.9, shimmer=.7)

sfx = np.zeros((2, N))
for i, c in enumerate(CUES):
    y = FX[c["type"]](max(c["dur"], .06)) * LEVEL[c["type"]] * c.get("gain", 1)
    s = int(c["t"] * SR); n = min(len(y), N - s)
    if n <= 0 or s < 0: continue
    pan = .5 + .18 * np.sin(i * 1.7)  # gentle spread
    sfx[0, s:s + n] += y[:n] * np.sqrt(1 - pan); sfx[1, s:s + n] += y[:n] * np.sqrt(pan)
sfx = np.stack([verb(sfx[0], .18), verb(sfx[1], .18)])

# ---------------- music ----------------
bpm = 100; beat = 60 / bpm; bar = 4 * beat
CH = [(50, [65, 69, 72, 76]), (46, [62, 65, 69, 72]), (43, [58, 62, 65, 69]), (45, [62, 64, 67, 72])]  # Dm9 Bbmaj9 Gm9 Asus
S = {int(k): v for k, v in T["scenes"].items()}
t = np.arange(N) / SR; mus = np.zeros((2, N))
def place(buf, y, s, ch=None):
    s = int(s * SR); n = min(len(y), N - s)
    if n <= 0: return
    if ch is None: buf[:, s:s + n] += y[:n]
    else: buf[ch, s:s + n] += y[:n]
chord_len = 2 * bar
end_brand = S[7][0] - .45
for k, c0 in enumerate(np.arange(0, DUR, chord_len)):
    root, notes = CH[k % 4]
    if c0 >= end_brand - .01: root, notes = (41, [65, 69, 72, 76])  # resolve to Fmaj9 under the brand
    d = min(chord_len + 1.2, DUR - c0); tt_ = tt(d); e = env(d, .9, 1.2)
    for side, det in ((0, -1.5), (1, 1.5)):
        pad = sum(np.sin(2 * np.pi * (hz(n) + det) * tt_) + .18 * np.sin(4 * np.pi * (hz(n) + det) * tt_) for n in notes) / len(notes)
        place(mus, lp(pad, 2200) * e * .30, c0, side)
    if c0 >= S[2][0] - .3:  # sub bass after the hook
        for bb in range(2):
            bt = c0 + bb * bar; dd = bar * .95; y = np.sin(2 * np.pi * hz(root - 12 + 12) * tt(dd)) * env(dd, .02, .5) * .22
            place(mus, y, bt)
grid = np.arange(0, DUR, beat / 2)
for i, g in enumerate(grid):
    groove = S[2][0] - .3 <= g < end_brand
    if groove and i % 4 == 0:  # soft kick on 1 and 3
        k_ = np.sin(2 * np.pi * np.cumsum(45 + 70 * np.exp(-tt(.32) * 30)) / SR) * np.exp(-tt(.32) * 10) * .55; place(mus, k_, g)
    if S[3][0] - .5 <= g < end_brand and i % 2 == 1:  # off-beat hats
        h = hp(noise(.05), 7000) * np.exp(-tt(.05) * 70) * .07; place(mus, h, g, i % 4 == 1 and 0 or 1)
arp_notes = [0, 2, 1, 3]
for i, g in enumerate(np.arange(S[4][0] - .5, end_brand, beat / 4)):  # 16th arp through the meeting scenes
    k = int(g // chord_len) % 4; notes = CH[k][1]; n = notes[arp_notes[i % 4]] + 12 * (i % 8 >= 4)
    y = lp(np.sin(2 * np.pi * hz(n) * tt(.22)) * np.exp(-tt(.22) * 16), 3500) * .055
    place(mus, y, g, i % 2)
# rests: lighter under the hook, a breath before the brand, then an open ending
lvl = np.ones(N); lvl[t < S[2][0] - .3] = .55
br = (t > end_brand - .6) & (t < end_brand); lvl[br] = np.linspace(1, .35, br.sum())
mus *= lvl
mus = np.stack([verb(mus[0], .3), verb(mus[1], .3)])
mus *= np.minimum(1, (DUR - t) / 1.2) * np.minimum(1, t / .4)  # fade in/out

def wav(path, x):
    x = np.clip(x, -1, 1); pcm = (x.T * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-", str(path)], input=pcm, check=True)
wav(AUD / "music.wav", norm(mus, .7)); wav(AUD / "sfx.wav", norm(sfx, .8))

# ---------------- final mix ----------------
# voice: clean-up EQ + gentle compression; music ducks under the voice (sidechain); sfx sit between them.
fc = ("[0:a]highpass=f=75,equalizer=f=220:t=q:w=1:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=2.5,acompressor=threshold=0.12:ratio=3:attack=8:release=120:makeup=1.6,"
      "aresample=48000,pan=stereo|c0=c0|c1=c0,asplit=2[v][vsc];"
      "[1:a]volume=0.34[m];[m][vsc]sidechaincompress=threshold=0.04:ratio=5:attack=25:release=380[md];"
      "[2:a]volume=0.55[s];[v][md][s]amix=inputs=3:normalize=0,atrim=0:" + f"{DUR}" + ",loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[o]")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(ROOT / "voice/voiceover.wav"), "-i", str(AUD / "music.wav"), "-i", str(AUD / "sfx.wav"),
                "-filter_complex", fc, "-map", "[o]", "-ar", "48000", str(AUD / "mix.wav")], check=True)
# bed without voice (for a voice recorded later): music + sfx at background level, room left for narration
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(AUD / "music.wav"), "-i", str(AUD / "sfx.wav"), "-filter_complex",
                f"[0:a]volume=0.34[m];[1:a]volume=0.55[s];[m][s]amix=inputs=2:normalize=0,atrim=0:{DUR},loudnorm=I=-20:TP=-2:LRA=11,aresample=48000[o]",
                "-map", "[o]", "-ar", "48000", str(AUD / "music-sfx-bed.wav")], check=True)
print("cues", len(CUES), "->", AUD / "mix.wav")
