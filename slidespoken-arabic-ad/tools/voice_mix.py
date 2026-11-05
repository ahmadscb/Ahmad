"""Trim each narration line, place them on one timeline, write:
voice/voiceover.wav (48 kHz mono), voice/timings.json, timings.js (for index.html), out/subtitles-ar.srt.
Usage: python3 tools/voice_mix.py"""
import json, subprocess, re
LEAD, GAP_IN, GAP_SCENE, TAIL = 0.35, 0.2, 0.46, 1.4
L = json.load(open("voice/lines.json"))
TRIM = "silenceremove=start_periods=1:start_threshold=-58dB,areverse,silenceremove=start_periods=1:start_threshold=-58dB,areverse"
for l in sorted(L, key=lambda l: "clip" in l):  # clips cut from other lines go last
    if "clip" in l:  # reuse a span of another (already trimmed) line
        c = l["clip"]
        subprocess.run(["ffmpeg","-y","-loglevel","error","-i",f"voice/lines/{c['src']}.trim.wav","-af",f"atrim={c['a']}:{c['b']},asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={c['b']-c['a']-0.05}:d=0.05",f"voice/lines/{l['id']}.trim.wav"],check=True)
    else:
      subprocess.run(["ffmpeg","-y","-loglevel","error","-i",f"voice/lines/{l['id']}.wav","-af",TRIM+",apad=pad_dur=0.06,aresample=48000",f"voice/lines/{l['id']}.trim.wav"],check=True)
    d = float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"voice/lines/{l['id']}.trim.wav"],capture_output=True,text=True).stdout)
    l["d"] = round(d, 3)
t, prev = LEAD, None
for l in L:
    if prev is not None: t += GAP_SCENE if l["scene"] != prev else GAP_IN
    l["start"], l["end"] = round(t, 3), round(t + l["d"], 3); t = l["end"]; prev = l["scene"]
total = round(t + TAIL, 2)
scenes = {}
for l in L: scenes.setdefault(l["scene"], [l["start"], l["end"]])[1] = l["end"]
inputs, f = [], []
for i, l in enumerate(L):
    inputs += ["-i", f"voice/lines/{l['id']}.trim.wav"]; ms = int(l["start"]*1000)
    f.append(f"[{i}:a]adelay={ms}|{ms}[a{i}]")
f.append("".join(f"[a{i}]" for i in range(len(L))) + f"amix=inputs={len(L)}:normalize=0,apad,atrim=0:{total}[o]")
subprocess.run(["ffmpeg","-y","-loglevel","error",*inputs,"-filter_complex",";".join(f),"-map","[o]","-ac","1","-ar","48000","voice/voiceover.wav"],check=True)
import numpy as np
pcm = np.frombuffer(subprocess.run(["ffmpeg","-loglevel","error","-i","voice/voiceover.wav","-f","s16le","-ac","1","-ar","48000","-"],capture_output=True).stdout, np.int16).astype(float)/32768
hop = 1600  # 30 fps
rms = np.array([np.sqrt(np.mean(pcm[i:i+hop]**2)) for i in range(0, len(pcm), hop)])
env = [round(float(x), 3) for x in np.clip(rms / (np.percentile(rms[rms > 0.01], 95) + 1e-9), 0, 1)]
for l in L:  # pauses inside a line (commas), used to sync visuals to words
    o = subprocess.run(["ffmpeg","-hide_banner","-i",f"voice/lines/{l['id']}.trim.wav","-af","silencedetect=noise=-36dB:d=0.07","-f","null","-"],capture_output=True,text=True).stderr
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", o)]; en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", o)]
    l["pauses"] = [[round(l["start"]+a,3), round(l["start"]+b,3)] for a, b in zip(st, en) if 0.05 < a and b < l["d"] - 0.1]
out = {"total": total, "lines": [{k: l[k] for k in ("id","scene","sub","start","end","pauses")} for l in L], "scenes": scenes, "env": env}
json.dump({k: v for k, v in out.items() if k != "env"}, open("voice/timings.json","w"), ensure_ascii=False, indent=1)
open("timings.js","w").write("window.TIMINGS=" + json.dumps(out, ensure_ascii=False) + ";\n")
def ts(x): h=int(x//3600); m=int(x%3600//60); s=x%60; return f"{h:02}:{m:02}:{int(s):02},{int(round(s%1*1000)):03}"
with open("out/subtitles-ar.srt","w") as s:
    for i,l in enumerate(L,1): s.write(f"{i}\n{ts(l['start'])} --> {ts(l['end']+0.15)}\n‫{l['sub']}‬\n\n")
print("total", total, {k:[round(a,2),round(b,2)] for k,(a,b) in scenes.items()})
