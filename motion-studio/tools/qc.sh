#!/usr/bin/env bash
# Automatic checks on a rendered MP4: spec, black frames, frozen stretches, loudness.
#   tools/qc.sh <video.mp4> [expected WxH] [expected fps]
set -uo pipefail
V=$1; WH=${2:-1080x1920}; FPS=${3:-30}
spec=$(ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=width,height,r_frame_rate,nb_read_frames,codec_name,pix_fmt -show_entries format=duration -of compact=p=0:nk=1 "$V" | tr '\n' ' ')
echo "spec: $spec"
read -r codec w h pix fr frames dur <<<"$(echo "$spec" | tr '|' ' ')"
ok=1
[[ "${w}x${h}" == "$WH" ]] || { echo "FAIL size ${w}x${h} != $WH"; ok=0; }
[[ "$fr" == "$FPS/1" ]] || { echo "FAIL fps $fr != $FPS"; ok=0; }
[[ "$codec" == "h264" && "$pix" == "yuv420p" ]] || { echo "FAIL codec $codec/$pix"; ok=0; }
an=$(ffmpeg -hide_banner -i "$V" -vf "blackdetect=d=0.15:pix_th=0.08,freezedetect=n=0.0015:d=1.2" -af "loudnorm=print_format=summary" -f null - 2>&1)
black=$(echo "$an" | grep -c "black_start"); freeze=$(echo "$an" | grep -oE "freeze_start: [0-9.]+" | awk '{print $2}' | tr '\n' ' ')
lufs=$(echo "$an" | grep -oE "Input Integrated: +[-0-9.]+" | awk '{print $3}'); tp=$(echo "$an" | grep -oE "Input True Peak: +[-+0-9.]+" | awk '{print $4}')
echo "black stretches (>0.15 s): $black"
echo "frozen stretches (>1.2 s) start at: ${freeze:-none}"
echo "loudness: ${lufs:-no audio} LUFS, true peak ${tp:-n/a} dBTP"
(( black == 0 )) || ok=0
exit $(( ok ? 0 : 1 ))
