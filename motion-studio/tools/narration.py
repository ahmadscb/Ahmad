"""Narration adapter: script lines -> one voice track + per-line timings (for syncing scenes and captions).
  python3 tools/narration.py <brief.json> <out-dir> [--provider piper|elevenlabs] [--allow-paid]
Writes <out-dir>/voice.wav and <out-dir>/voice-timings.json ({"lines":[{"id","text","start","end"}], "total"}).

Providers
  piper       offline, free. Needs a Piper .onnx voice (env PIPER_VOICE=/path/voice.onnx) and `pip install piper-tts`.
  elevenlabs  paid API. Refuses unless --allow-paid AND env ELEVENLABS_API_KEY is set. The key is read from the
              environment only, never logged or written. Voice id from brief.narration.voice.
Design: each line is synthesized separately, trimmed, and laid out with gaps, so a scene can start on its line
(`voice-timings.json`), exactly as in the SlideSpoken Arabic ads. Nothing here publishes anything."""
import json, os, subprocess, sys, tempfile, urllib.request

GAP = .3

def piper(text, out_wav):
    voice = os.environ.get('PIPER_VOICE')
    if not voice or not os.path.exists(voice): sys.exit('piper: set PIPER_VOICE to a downloaded .onnx voice (free, offline)')
    import wave
    from piper import PiperVoice
    v = PiperVoice.load(voice)
    with wave.open(out_wav, 'wb') as w: v.synthesize_wav(text, w)

def elevenlabs(text, out_wav, voice_id):
    key = os.environ.get('ELEVENLABS_API_KEY')
    if not key: sys.exit('elevenlabs: ELEVENLABS_API_KEY is not set')
    if not voice_id: sys.exit('elevenlabs: brief.narration.voice (voice id) is required')
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128', method='POST',
                                 data=json.dumps({'text': text, 'model_id': 'eleven_multilingual_v2'}).encode(),
                                 headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    with urllib.request.urlopen(req, timeout=120) as r, tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f: f.write(r.read()); mp3 = f.name
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp3, out_wav], check=True); os.unlink(mp3)

def dur(f): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)

def main():
    a = sys.argv[1:]
    if len(a) < 2: sys.exit(__doc__)
    brief = json.load(open(a[0])); out = a[1]; os.makedirs(out, exist_ok=True)
    nar = brief.get('narration', {}); prov = a[a.index('--provider') + 1] if '--provider' in a else nar.get('provider', 'piper')
    if prov == 'elevenlabs' and not ('--allow-paid' in a and nar.get('allow_paid')):
        sys.exit('elevenlabs is a paid service: pass --allow-paid AND set narration.allow_paid=true in the brief')
    lines = nar.get('script', [])
    if not lines: sys.exit('brief.narration.script is empty')
    tmp = tempfile.mkdtemp(); t = .3; timing = []; parts = []
    trim = 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse'
    for i, line in enumerate(lines):
        text = line['text'] if isinstance(line, dict) else str(line); raw = f'{tmp}/{i}.wav'; cut = f'{tmp}/{i}c.wav'
        piper(text, raw) if prov == 'piper' else elevenlabs(text, raw, nar.get('voice'))
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', trim + ',aresample=48000', '-ac', '1', cut], check=True)
        d = dur(cut); timing.append({'id': line.get('id', f'l{i}') if isinstance(line, dict) else f'l{i}', 'text': text, 'start': round(t, 3), 'end': round(t + d, 3)})
        parts.append((cut, t)); t += d + (line.get('gap', GAP) if isinstance(line, dict) else GAP)
    ins, fc = [], []
    for k, (f, st) in enumerate(parts): ins += ['-i', f]; fc.append(f'[{k}:a]adelay={int(st * 1000)}|{int(st * 1000)}[a{k}]')
    fc.append(''.join(f'[a{k}]' for k in range(len(parts))) + f'amix=inputs={len(parts)}:normalize=0,apad,atrim=0:{t + .5}[o]')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *ins, '-filter_complex', ';'.join(fc), '-map', '[o]', f'{out}/voice.wav'], check=True)
    json.dump({'lines': timing, 'total': round(t + .5, 3), 'provider': prov}, open(f'{out}/voice-timings.json', 'w'), indent=1, ensure_ascii=False)
    print('voice ->', f'{out}/voice.wav', f'({len(lines)} lines, {t:.1f}s, provider {prov})')

if __name__ == '__main__': main()
