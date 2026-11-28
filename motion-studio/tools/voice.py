"""Character dialogue, fully local and free: text -> per-character voice -> timed track + lip-sync visemes.
  python3 tools/voice.py <dialogue.json> <out-dir>
dialogue.json: {"lines": [{"who": "dave", "text": "...", "t0": 2.0 (optional), "gap": .25 (optional), "speed": 1.0}], "duration": 30}
Writes  out-dir/dialog.wav     (one track, full duration, ready for bin/bm-render --voice)
        out-dir/dialog.json    ({lines: [{who, text, t0, t1, visemes[]}]})
        out-dir/dialog.js      (window.DIALOG = same; load with <script src="out/voice/dialog.js"> and call BM.say(..., {visemes}))
Engine: sherpa-onnx (pip, Apache-2.0) + Piper voice en_US-libritts_r-medium (MIT model, LibriTTS-R data CC BY 4.0:
credit "Voices: LibriTTS-R (CC BY 4.0)"). Download: tools/get-voices.sh. Each cast member has a fixed speaker id = consistent voice."""
import json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from lipsync import frames as visemes

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VDIR = os.environ.get('BM_VOICES', os.path.join(HERE, 'voices', 'vits-piper-en_US-libritts_r-medium'))
# fixed casting (speaker id, speed): chosen by measured pitch; male ~86-92 Hz, female ~200-245 Hz
CAST = {'dave': (552, 1.05), 'omar': (132, .95), 'kenji': (426, 1.0), 'sam': (36, 1.05), 'rex': (186, .92),
        'maya': (624, 1.03), 'lina': (372, 1.0), 'grace': (450, .93), 'zara': (378, 1.06), 'leo': (60, 1.1), 'narrator': (186, 1.0),
        # Sarcastic Grotesque cast (lib/grotesque.js)
        'gary': (426, .9), 'brock': (186, .94), 'kyle': (552, 1.14), 'vlad': (36, 1.12), 'tiff': (378, 1.1), 'bev': (450, .95),
        'zeke': (342, 1.08), 'marco': (594, 1.02), 'dale': (738, 1.1), 'pip': (60, 1.15)}
SR_OUT = 48000

def engine():
    import sherpa_onnx
    m = [f for f in os.listdir(VDIR) if f.endswith('.onnx')][0]
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(
        model=os.path.join(VDIR, m), tokens=os.path.join(VDIR, 'tokens.txt'), data_dir=os.path.join(VDIR, 'espeak-ng-data')), num_threads=2))
    return sherpa_onnx.OfflineTts(cfg)

def trim(x, sr, th=.01):
    idx = np.where(np.abs(x) > th)[0]
    return x[max(0, idx[0] - int(.02 * sr)): idx[-1] + int(.05 * sr)] if len(idx) else x

def main():
    a = sys.argv[1:]
    if len(a) < 2: print(__doc__); sys.exit(2)
    spec = json.load(open(a[0])); out = a[1]; os.makedirs(out, exist_ok=True)
    tts = engine(); clips = []; t = spec.get('start', .3)
    for i, ln in enumerate(spec['lines']):
        sid, spd = CAST.get(ln['who'], CAST['narrator'])
        g = tts.generate(ln['text'], sid=ln.get('sid', sid), speed=ln.get('speed', spd))
        x = trim(np.array(g.samples, dtype=np.float32), g.sample_rate)
        x = np.interp(np.arange(int(len(x) * SR_OUT / g.sample_rate)) * g.sample_rate / SR_OUT, np.arange(len(x)), x)   # resample to 48 kHz
        t0 = ln['t0'] if 't0' in ln else t; d = len(x) / SR_OUT
        clips.append((t0, x, {'who': ln['who'], 'text': ln['text'], 't0': round(t0, 3), 't1': round(t0 + d, 3)}))
        t = t0 + d + ln.get('gap', spec.get('gap', .25))
    D = max(spec.get('duration', 0), t + .5); buf = np.zeros(int(D * SR_OUT), np.float32)
    for t0, x, _ in clips:
        s = int(t0 * SR_OUT); buf[s:s + len(x)] += x[: len(buf) - s]
    buf = buf / (np.max(np.abs(buf)) + 1e-9) * .89
    wav = os.path.join(out, 'dialog.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR_OUT), '-ac', '1', '-i', '-', wav], input=buf.tobytes(), check=True)
    lines = []
    for _, _, m in clips: m['visemes'] = visemes(wav, 30, m['t0'], m['t1']); lines.append(m)
    res = {'duration': round(D, 3), 'lines': lines}
    json.dump(res, open(os.path.join(out, 'dialog.json'), 'w'))
    open(os.path.join(out, 'dialog.js'), 'w').write('window.DIALOG = ' + json.dumps(res) + ';\n')
    for m in lines: print(f"{m['t0']:6.2f}-{m['t1']:6.2f}  {m['who']:6s} {m['text']}")
    print('voice ->', wav, f'({len(lines)} lines, {D:.1f}s)')

if __name__ == '__main__': main()
