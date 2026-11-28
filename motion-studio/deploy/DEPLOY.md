# Deploying Motion Studio on a Contabo VPS (CPU-only)

Motion Studio is a portable, reproducible install. Everything lives in one prefix plus one state directory. It opens no network ports, publishes nothing, and runs one render at a time under hard CPU and memory limits.

> **Status:** prepared and tested in a sandbox (install → health check → queued render job → uninstall). **Not deployed remotely**: that needs your authorization and SSH access.

## 1. Server sizing

| Plan (Contabo) | vCPU / RAM | Use |
|---|---|---|
| Cloud VPS 10 | 4 / 8 GB | works (`--cpus 3 --mem 4G`) |
| Cloud VPS 20 | 6 / 12 GB | recommended (`--cpus 5 --mem 6G`); headroom for other services |
| any | — | ≥ 15 GB free disk (Chromium 0.4 GB, voices 0.08 GB, about 30–80 MB per finished reel) |

The measured cost of one 30-second 2D reel is in the final report. At those rates, **four reels a day is about 1–2 % of one day's machine time**. The headless Claude session (brief → code) usually dominates the wall time, not the rendering.

## 2. Install

```bash
git clone https://github.com/ahmadscb/ahmad.git && cd ahmad/motion-studio
sudo deploy/install.sh --cpus 3 --mem 4G            # add --dry-run first to see every step
```

The installer does eight things:

1. Installs apt packages: ffmpeg, python3-venv, nodejs/npm, rsync, curl, bzip2.
2. Creates the system user `motion` (no login shell).
3. Copies the code to `/opt/motion-studio`. Renders and state are not copied.
4. Creates a private Python venv from pinned `deploy/requirements.txt`: numpy, scipy, sherpa-onnx.
5. Installs pinned Node runtime `playwright@1.63.0` (`package-lock.json`, installed with `npm ci`), with Chromium installed inside the prefix.
6. Downloads the free voice model: Piper LibriTTS-R, CC BY 4.0, about 80 MB, from GitHub releases.
7. Writes `/etc/motion-studio.env` (limits) and `/usr/local/bin/bm` (CLI wrapper).
8. Sets up systemd units:
   - `motion-studio-worker.service`: `CPUQuota`, `MemoryMax`, `MemorySwapMax=0`, `Nice=10`, idle I/O, `ProtectSystem=strict`, `NoNewPrivileges`, `PrivateTmp`, writable only in `projects/` and `/var/lib/motion-studio`;
   - `motion-studio-cleanup.timer`: daily cleanup.

Other options:

- `--no-systemd`: run the worker yourself (`bm worker`).
- `--skip-apt`: packages are already present.
- `--browsers-from DIR`: offline Chromium.
- `--prefix`, `--user`.

The installer is idempotent: re-run it to upgrade the code, and the existing `/etc/motion-studio.env` is kept.

### Brief jobs need the Claude Code CLI

Brief jobs (creative brief → finished video) run `claude -p` on the operator's existing plan. Log in once:

```bash
sudo npm i -g @anthropic-ai/claude-code
sudo -u motion -H claude          # interactive login, once
```

Render-only jobs don't need it.

## 3. Use (Hermes-compatible: JSON in, JSON out)

```bash
echo '{"type":"brief","brief":"Create a funny 30-second animated video about a cat who runs a bakery."}' | bm submit
# {"job_id": "20261128-064641-983b60", "status": "queued"}
bm status 20261128-064641-983b60        # {"state": "running", "attempts": 1, ...}
bm result 20261128-064641-983b60        # {"mp4": "/opt/motion-studio/projects/.../out/....mp4", "qc_pass": true, "render_metrics": {...}, "agent": {...}}
bm list --state done ;  bm cancel <id> ;  bm health ;  bm cleanup
```

- **Schemas:** `schemas/job.schema.json`, `schemas/status.schema.json`, `schemas/result.schema.json`.
- **Exit codes:**
  - `0`: OK;
  - `1`: not ready or failed;
  - `2`: invalid input;
  - `3`: another worker already holds the lock.
- **Four reels a day from Hermes:** submit four brief jobs, for example at 06:00, from Hermes' own scheduler. The worker runs them one after another. Hermes polls `bm result` and hands the MP4 to a human for review. **Auto-publishing is deliberately not implemented.**

## 4. Reliability features

| Feature | How |
|---|---|
| Render queue | `var/queue/*.json`, processed in order by one worker |
| Concurrent-job protection | `flock` on `var/worker.lock`; a second worker exits with code 3 |
| Resource limits | systemd `CPUQuota`/`MemoryMax` on the worker, plus `bin/bm-safe` per render (memory watchdog, `taskset`, `nice`, `ionice`) |
| Timeouts | `BM_JOB_TIMEOUT` (default 2 h) kills the whole process group |
| Error recovery | a failed job is retried `BM_RETRIES` times; jobs left "running" by a crash or reboot are re-queued when the worker starts; `Restart=on-failure` |
| Temp cleanup | per-job `TMPDIR` deleted after each job; daily timer removes old jobs, key-frame folders and intermediate video after `BM_RETENTION_DAYS` |
| Audit | `projects/<name>.agent.jsonl` records every tool call the agent made; `var/jobs/<id>/attempt-N.log` holds the render log |

## 5. Security notes

- Agent sessions get a tool allowlist:
  - allowed: edit files, run the studio's own scripts, `node`, `python3`, `ffmpeg`;
  - denied: `git`, `curl`, `wget`, `rm`, `ssh`, web fetch and web search.
  
  The system prompt confines it to its own project folder.
- No API keys are needed. ElevenLabs stays disabled unless `--allow-paid`, a brief flag and a key are all present.
- The worker unit can't write outside its two directories, and gains no privileges.

## 6. Uninstall

```bash
sudo deploy/uninstall.sh            # removes units, prefix, wrapper; keeps renders in /var/lib/motion-studio/kept-projects
sudo deploy/uninstall.sh --purge    # also deletes renders, job history, config and the service user
```

## 7. Troubleshooting

- `bm health` lists every dependency and reports free disk and load.
- If Chromium is missing, run `sudo -u motion env PLAYWRIGHT_BROWSERS_PATH=/opt/motion-studio/browsers /opt/motion-studio/runtime/node_modules/.bin/playwright install chromium`.
- If a job fails, read `var/jobs/<id>/attempt-1.log`, then `projects/<name>.agent.json` (agent report) and `projects/<name>/out/qc.txt`.
