"""Sound design from a film's own cue list: original music + sound effects, synthesized (no samples, no licences, no API).
  python3 tools/sound.py <cues.json> <out.wav> [--voice vo.wav]
cues.json = {"duration": s, "sfx": [{t,type,gain,dur}], "music": [{t0,t1,style,gain}]} (written by tools/snap.mjs from OPENER.SFX/MUSIC).
Music styles: lofi, lofi_broke, tension, sad, hype, cinematic, pulse. A voice track (optional) ducks the music.
Output is loudness-normalised to -14 LUFS / -1.5 dBTP (Instagram/TikTok/YouTube)."""
import json, subprocess, sys, tempfile, os
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
rng = np.random.default_rng(7)
def tt(d): return np.arange(int(max(d, .01) * SR)) / SR
def noise(d): return rng.standard_normal(int(max(d, .01) * SR))
def bp(x, lo, hi): return sosfilt(butter(2, [lo, min(hi, SR / 2 - 100)], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'highpass', fs=SR, output='sos'), x)
def env(d, a=.01, r=.1):
    n = int(d * SR); e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[n - nr:] *= np.linspace(1, 0, nr)
    return e
def norm(x, p=1.): m = np.max(np.abs(x)) + 1e-9; return x / m * p
def fit(x, d): n = int(d * SR); return np.pad(x, (0, max(0, n - len(x))))[:n]   # pad or trim to d seconds
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def osc(f, d, kind='sine'):
    t = tt(d); ph = 2 * np.pi * np.cumsum(np.broadcast_to(f, t.shape)) / SR
    if kind == 'sine': return np.sin(ph)
    if kind == 'saw': return 2 * ((ph / (2 * np.pi)) % 1) - 1
    if kind == 'square': return np.sign(np.sin(ph))
    if kind == 'tri': return 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1) - 1) - 1
IR = np.exp(-tt(1.6) * 3.5) * rng.standard_normal(int(1.6 * SR)); IR = lp(IR, 6000); IR /= np.sqrt(np.sum(IR ** 2))
def verb(x, wet=.25): return x + wet * fftconvolve(x, IR)[: len(x)]
def bell(f, d=1.2, dec=3.): t = tt(d); return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * dec * k) for m, a, k in ((1, 1, 1), (2.76, .3, 1.8), (5.4, .1, 2.6)))

# ---------------- sound effects ----------------
def sweep(f0, f1, d, kind='sine', curve=1.):
    q = np.linspace(0, 1, int(d * SR)) ** curve; return osc(f0 + (f1 - f0) * q, d, kind)
FX = {
 'scratch': lambda d: norm(bp(noise(.35), 400, 3000) * (np.sin(np.linspace(0, 9 * np.pi, int(.35 * SR))) > 0) * env(.35, .01, .1) + .5 * sweep(900, 120, .35, 'saw'), .6),
 'crash':   lambda d: norm(lp(noise(1.2), 2500) * np.exp(-tt(1.2) * 3) + 1.2 * sweep(90, 30, 1.2) * np.exp(-tt(1.2) * 2.5), .9),
 'gasp':    lambda d: norm(bp(noise(.35), 700, 2600) * env(.35, .03, .2), .45),
 'spit':    lambda d: norm(bp(noise(.4), 600, 5000) * env(.4, .005, .3) ** 2 + .4 * bp(noise(.4), 150, 600) * env(.4, .005, .35), .7),
 'alarm':   lambda d: norm(lp(osc(np.where((tt(d) * 4).astype(int) % 2, 880, 660), d, 'square'), 3000) * env(d, .01, .1), .3),
 'trombone': lambda d: norm(np.concatenate([lp(osc(hz(n) * (1 + .012 * np.sin(2 * np.pi * 6 * tt(L)) * (k == 3)), L, 'saw'), 1600) * env(L, .03, .12)
                                            for k, (n, L) in enumerate(((58, .42), (57, .42), (56, .42), (55, 1.3)))]), .55),
 'paper':   lambda d: norm(hp(noise(.25), 2000) * env(.25, .01, .2) * (1 + np.sin(2 * np.pi * 30 * tt(.25))), .25),
 'rain':    lambda d: norm(bp(noise(d), 1500, 7000) * env(d, .3, .5), .18),
 'creak':   lambda d: norm(osc(140 + 40 * np.sin(2 * np.pi * 3 * tt(.5)), .5, 'saw') * env(.5, .05, .2) * (np.sin(2 * np.pi * 40 * tt(.5)) > -.2), .3),
 'flutter': lambda d: norm(bp(noise(d), 300, 1500) * (.5 + .5 * np.sin(2 * np.pi * 26 * tt(d))) * env(d, .05, .3), .25),
 'ding':    lambda d: norm(bell(hz(88), 1.4) + .6 * np.concatenate([np.zeros(int(.1 * SR)), bell(hz(95), 1.3)])[: int(1.4 * SR)], .45),
 'riser':   lambda d: norm(hp(noise(d), 800) * (tt(d) / d) ** 2.2 * .5 + sweep(180, 1400, d, 'saw', 2) * (tt(d) / d) ** 2 * .4, .55),
 'whoosh':  lambda d: norm(bp(noise(.7), 300, 4000) * np.sin(np.linspace(0, np.pi, int(.7 * SR))) ** 2, .55),
 'register': lambda d: norm(np.concatenate([lp(noise(.06), 3000) * env(.06, .001, .05), bell(hz(96), 1.0, 2.5) + .7 * bell(hz(100), 1.0, 2.5)]), .55),
 'coin':    lambda d: norm(bell(hz(100), .5, 6) + .5 * bell(hz(105), .5, 6), .25),
 'pop':     lambda d: norm(np.pad(sweep(900, 300, .12) * np.exp(-tt(.12) * 30), (0, int(.38 * SR))) + bp(noise(.5), 2000, 9000) * np.exp(-tt(.5) * 5) * .4, .8),
 'horn':    lambda d: norm(lp(osc(370, .45, 'square') + osc(466, .45, 'square'), 2500) * env(.45, .02, .08), .3),
 'fall':    lambda d: norm(sweep(1800, 300, .55) * env(.55, .02, .05), .35),
 'impact':  lambda d: norm(sweep(110, 35, 1.4) * np.exp(-tt(1.4) * 3) + .5 * lp(noise(1.4), 1200) * np.exp(-tt(1.4) * 6), 1.),
 'shatter': lambda d: norm(hp(noise(1.0), 3000) * np.exp(-tt(1.0) * 4) * (1 + (np.sin(2 * np.pi * 47 * tt(1.0)) > .6)), .5),
 'thud':    lambda d: norm(sweep(90, 40, .4) * np.exp(-tt(.4) * 9), .8),
 'slurp':   lambda d: norm(bp(noise(.45), 400, 1800) * (.5 + .5 * np.sin(2 * np.pi * 14 * tt(.45))) * env(.45, .05, .15), .35),
 'slurp_empty': lambda d: norm(bp(noise(.8), 300, 1300) * (np.sin(2 * np.pi * 9 * tt(.8)) > .3) * env(.8, .02, .2), .4),
 'buzz':    lambda d: norm(lp(osc(155, .5, 'square'), 800) * (np.sin(2 * np.pi * 8 * tt(.5)) > 0), .35),
 'boing':   lambda d: norm(sweep(220, 520, .5) * (1 + .3 * np.sin(2 * np.pi * 18 * tt(.5))) * np.exp(-tt(.5) * 5), .45),
 'twitch':  lambda d: norm(np.concatenate([sweep(500, 900, .05) * env(.05, .002, .02), np.zeros(int(.07 * SR))] * 3), .25),
 'cash_tiny': lambda d: norm(bell(hz(103), .6, 5), .22),
 'sting':   lambda d: norm(np.concatenate([lp(osc(hz(n), .16, 'square'), 3000) * env(.16, .005, .05) for n in (72, 76, 79)] + [lp(osc(hz(84), .7, 'square'), 3000) * env(.7, .005, .5)]), .35),
 'crack':   lambda d: norm(hp(noise(.12), 2500) * np.exp(-tt(.12) * 40), .5),
 # premium-ad effects
 'hit':     lambda d: norm(sweep(70, 32, 2.5) * np.exp(-tt(2.5) * 1.6) + .3 * lp(noise(2.5), 400) * np.exp(-tt(2.5) * 3), 1.),
 'sub_drop': lambda d: norm(sweep(80, 28, 1.8) * env(1.8, .02, 1.0), .9),
 'shimmer': lambda d: norm(sum(fit(np.concatenate([np.zeros(int(i * .09 * SR)), bell(hz(n), 1.8, 1.2)]), 2.2) for i, n in enumerate((84, 88, 91, 95, 98))), .3),
 'tick':    lambda d: norm(bp(noise(.03), 3000, 9000) * np.exp(-tt(.03) * 120), .25),
 'swell':   lambda d: norm(lp(sum(osc(hz(n), d, 'saw') for n in (45, 52, 57, 64)), 1200) * (tt(d) / d) ** 2 * env(d, .01, .2), .5),
 'glint':   lambda d: norm(sweep(3000, 7000, .35) * np.exp(-tt(.35) * 9) + .4 * bell(hz(108), .35, 8), .25),
}

# ---------------- music ----------------
def place(buf, y, t0, g=1.):
    s = int(t0 * SR); n = min(len(y), buf.shape[-1] - s)
    if n > 0 and s >= 0: buf[..., s:s + n] += y[:n] * g
def kick(d=.35, f0=120): return sweep(f0, 42, d) * np.exp(-tt(d) * 9)
def snare(): return bp(noise(.2), 900, 6000) * np.exp(-tt(.2) * 18) * .6 + osc(190, .2) * np.exp(-tt(.2) * 25) * .3
def hat(): return hp(noise(.05), 7000) * np.exp(-tt(.05) * 70) * .35
def ep(f, d): t = tt(d); return (np.sin(2 * np.pi * f * t) + .25 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 2.2) * (1 + .1 * np.sin(2 * np.pi * 5 * t))
CHORDS = {'lofi': [(50, 53, 57, 60), (55, 59, 62, 65), (48, 52, 55, 59), (45, 48, 52, 55)],   # Dm7 G7 Cmaj7 Am7
          'sad': [(45, 52, 57, 60), (41, 48, 53, 57), (48, 52, 55, 60), (43, 50, 55, 59)],
          'hype': [(48, 55, 60, 64), (43, 50, 55, 59), (45, 52, 57, 60), (41, 48, 53, 57)],
          'cinematic': [(38, 45, 50, 57), (34, 41, 46, 53), (41, 48, 53, 60), (36, 43, 48, 55)]}
def music(style, d):
    out = np.zeros(int(d * SR))
    if style in ('lofi', 'lofi_broke'):
        bpm = 78; beat = 60 / bpm; bar = 4 * beat
        for k, b0 in enumerate(np.arange(0, d, bar)):
            for n in CHORDS['lofi'][k % 4]: place(out, ep(hz(n) * (1.004 if style == 'lofi_broke' else 1), bar), b0, .16)
            place(out, kick(), b0, .55); place(out, kick(), b0 + 2.5 * beat, .45); place(out, snare(), b0 + beat, .5); place(out, snare(), b0 + 3 * beat, .5)
            for h in range(8): place(out, hat(), b0 + h * beat / 2 + (.06 if h % 2 else 0), .5)
        out = lp(out, 3200) + .015 * hp(noise(d), 3000) * (rng.random(int(d * SR)) > .9995) * 30   # warm + vinyl crackle
        if style == 'lofi_broke': out = out * (1 + .08 * np.sin(2 * np.pi * .5 * tt(d)))
    elif style == 'tension':
        for k, b0 in enumerate(np.arange(0, d, .21)):
            place(out, lp(osc(hz(38 + (k // 8) % 3), .18, 'saw'), 600) * env(.18, .005, .08), b0, .5)
        place(out, hp(noise(d), 4000) * .05, 0)
    elif style == 'sad':
        bar = 2.4
        for k, b0 in enumerate(np.arange(0, d, bar)):
            ch = CHORDS['sad'][k % 4]
            for i, n in enumerate(ch): place(out, ep(hz(n + 12), 2.2), b0 + i * .3, .2)
            place(out, lp(osc(hz(ch[0] - 12), bar, 'tri'), 300) * env(bar, .3, .6), b0, .25)
        out = verb(out, .35)
    elif style == 'hype':
        bpm = 120; beat = 60 / bpm; bar = 4 * beat
        for k, b0 in enumerate(np.arange(0, d, bar)):
            ch = CHORDS['hype'][k % 4]
            for b in range(4): place(out, kick(.3, 140), b0 + b * beat, .8); place(out, hat(), b0 + b * beat + beat / 2, .8)
            for b in (1, 3): place(out, snare(), b0 + b * beat, .7)
            for e in range(8): place(out, lp(osc(hz(ch[0] - 12 + (12 if e % 2 else 0)), beat / 2 * .9, 'saw'), 900) * env(beat / 2 * .9, .005, .05), b0 + e * beat / 2, .35)
            for n in ch[1:]: place(out, lp(osc(hz(n + 12), .22, 'saw'), 2600) * env(.22, .005, .12), b0, .14); place(out, lp(osc(hz(n + 12), .22, 'saw'), 2600) * env(.22, .005, .12), b0 + 2.5 * beat, .12)
    elif style == 'cinematic':
        bar = 3.2
        for k, b0 in enumerate(np.arange(0, d, bar)):
            for n in CHORDS['cinematic'][k % 4]: place(out, lp(osc(hz(n) * (1 + .002 * (n % 3)), bar + 1, 'saw'), 900) * env(bar + 1, 1.2, 1.2), b0, .1)
            place(out, sweep(55, 50, bar) * env(bar, .5, .8), b0, .3)
        out = verb(out, .4)
    elif style == 'pulse':
        beat = .5
        for k, b0 in enumerate(np.arange(0, d, beat)):
            place(out, kick(.25, 90), b0, .35 if k % 2 == 0 else 0); place(out, hat(), b0 + beat / 2, .3)
            place(out, lp(osc(hz(38), beat * .8, 'saw'), 300) * env(beat * .8, .01, .2), b0, .3)
    return out * env(d, .25, .4)

def main():
    a = sys.argv[1:]; cues = json.load(open(a[0])); out = a[1]; voice = a[a.index('--voice') + 1] if '--voice' in a else None
    D = cues['duration']; N = int(D * SR); mus = np.zeros(N); sfx = np.zeros(N)
    for m in cues.get('music', []): place(mus, norm(music(m['style'], m['t1'] - m['t0']), .6), m['t0'], m.get('gain', 1))
    for c in cues.get('sfx', []):
        f = FX.get(c['type'])
        if f is None: print('unknown sfx', c['type']); continue
        place(sfx, f(c.get('dur') or .5), c['t'], c.get('gain', 1) * .8)
    sfx = verb(sfx, .12); mus = verb(mus, .1)
    fade = np.minimum(1, (D - np.arange(N) / SR) / .5)
    tmp = tempfile.mkdtemp(); wav = lambda n, x: (subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', f'{tmp}/{n}.wav'],
                                                               input=(np.clip(x, -1, 1) * 32767).astype('<i2').tobytes(), check=True), f'{tmp}/{n}.wav')[1]
    m_ = wav('m', norm(mus, .7) * fade); s_ = wav('s', norm(sfx, .8) * fade)
    if voice:
        fc = '[2:a]aresample=48000,aformat=channel_layouts=mono,asplit[v][vs];[0:a][vs]sidechaincompress=threshold=0.04:ratio=6:attack=20:release=350[md];[md]volume=0.35[mm];[1:a]volume=0.6[ss];[v][mm][ss]amix=inputs=3:normalize=0'
        ins = ['-i', m_, '-i', s_, '-i', voice]
    else:
        fc = '[0:a]volume=0.5[mm];[1:a]volume=0.75[ss];[mm][ss]amix=inputs=2:normalize=0'; ins = ['-i', m_, '-i', s_]
    pre = f'{tmp}/pre.wav'   # mix first, then two-pass loudness normalisation (single pass overshoots on punchy material)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *ins, '-filter_complex', fc + f',atrim=0:{D},pan=stereo|c0=c0|c1=c0[o]', '-map', '[o]', pre], check=True)
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-i', pre, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    ln = f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', pre, '-af', ln + ',aresample=48000', out], check=True)
    print('sound ->', out, f'({len(cues.get("sfx", []))} sfx, {len(cues.get("music", []))} music sections)')

if __name__ == '__main__': main()
