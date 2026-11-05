"""Synthesize each narration line with the offline Piper ar_JO-kareem voice.
Usage: python3 tools/tts.py MODEL.onnx  -> voice/lines/<id>.wav + voice/durations.json"""
import json, sys, wave, os
from piper import PiperVoice, SynthesisConfig
v = PiperVoice.load(sys.argv[1])
cfg = SynthesisConfig(length_scale=float(os.environ.get("LS","0.86")), noise_scale=0.62, noise_w_scale=0.8)
os.makedirs("voice/lines", exist_ok=True)
dur = {}
for L in json.load(open("voice/lines.json")):
    p = f"voice/lines/{L['id']}.wav"
    with wave.open(p, "wb") as w:
        v.synthesize_wav(L["tts"], w, syn_config=cfg)
    with wave.open(p) as w:
        dur[L["id"]] = round(w.getnframes() / w.getframerate(), 3)
json.dump(dur, open("voice/durations.json", "w"), indent=1)
print(dur, sum(dur.values()))
