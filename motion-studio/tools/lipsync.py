"""Audio-driven mouth animation, fully local (NumPy/SciPy only).
  python3 tools/lipsync.py <voice.wav> [--fps 30] [--t0 0] [--t1 end] > visemes.json
Per video frame: RMS energy + spectral shape -> one of 5 visemes used by lib/characters.js
  0 v_closed (silence, M/B/P), 1 v_small (quiet), 2 v_open (A), 3 v_wide (E/I: bright spectrum), 4 v_round (O/U: dark spectrum).
Smoothed so a mouth shape holds >= 2 frames (no 30 Hz jitter). Importable: frames(wav_path, fps, t0, t1)."""
import json, subprocess, sys
import numpy as np

def load(path, sr=16000):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, '<i2').astype(np.float32) / 32768, sr

def frames(path, fps=30, t0=0., t1=None):
    x, sr = load(path)
    x = x[int(t0 * sr): int(t1 * sr) if t1 else None]
    hop = sr // fps; n = max(1, len(x) // hop); win = np.hanning(hop * 2)
    rms = np.zeros(n); cen = np.zeros(n); low = np.zeros(n)
    f = np.fft.rfftfreq(hop * 2, 1 / sr)
    for i in range(n):
        seg = x[i * hop: i * hop + hop * 2]
        if len(seg) < hop * 2: seg = np.pad(seg, (0, hop * 2 - len(seg)))
        rms[i] = np.sqrt(np.mean(seg ** 2))
        sp = np.abs(np.fft.rfft(seg * win)); band = (f > 80) & (f < 5000); s = sp[band] + 1e-9
        cen[i] = np.sum(f[band] * s) / np.sum(s); low[i] = np.sum(sp[(f > 80) & (f < 700)]) / np.sum(s)
    ref = np.percentile(rms[rms > 0], 95) if np.any(rms > 0) else 1
    e = rms / (ref + 1e-9); out = []
    for i in range(n):
        if e[i] < .08: v = 0
        elif e[i] < .25: v = 1
        elif low[i] > .7 and cen[i] < 750: v = 4
        elif cen[i] > 1700: v = 3
        else: v = 2
        out.append(v)
    for i in range(1, n - 1):            # hold: no single-frame flickers
        if out[i] != out[i - 1] and out[i] != out[i + 1]: out[i] = out[i - 1]
    if out: out[-1] = 0
    return out

if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(2)
    g = lambda k, d: type(d)(a[a.index(k) + 1]) if k in a else d
    t1 = g('--t1', 0.) or None
    print(json.dumps(frames(a[0], g('--fps', 30), g('--t0', 0.), t1)))
