"""Round-trip QC: transcribe each synthesized line with offline Whisper-small (Arabic).
Usage: python3 tools/asr_check.py WHISPER_DIR"""
import sys, json, wave, numpy as np, sherpa_onnx, subprocess
D = sys.argv[1].rstrip("/") + "/"
r = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=D+"small-encoder.int8.onnx", decoder=D+"small-decoder.int8.onnx", tokens=D+"small-tokens.txt", language="ar", task="transcribe", num_threads=4)
for l in json.load(open("voice/lines.json")):
    pcm = subprocess.run(["ffmpeg","-loglevel","error","-i",f"voice/lines/{l['id']}.trim.wav","-ar","16000","-ac","1","-f","s16le","-"],capture_output=True).stdout
    s = r.create_stream(); s.accept_waveform(16000, np.frombuffer(pcm, np.int16).astype(np.float32)/32768); r.decode_stream(s)
    print(l["id"], "| sub:", l["sub"], "\n      asr:", s.result.text.strip())
