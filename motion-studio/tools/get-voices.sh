#!/usr/bin/env bash
# Download the free local voice model used by tools/voice.py (Piper en_US-libritts_r-medium, MIT model / CC BY 4.0 data, ~80 MB).
set -euo pipefail
cd "$(dirname "$0")/.." && mkdir -p voices
[ -f voices/vits-piper-en_US-libritts_r-medium/tokens.txt ] && { echo "voices already present"; exit 0; }
curl -fsSL https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-en_US-libritts_r-medium.tar.bz2 | tar -xj -C voices
echo "voices -> $(pwd)/voices"
