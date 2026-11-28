#!/usr/bin/env bash
# Motion Studio: portable, reproducible, CPU-only install (Ubuntu 22.04/24.04, Debian 12; tested target: Contabo VPS).
#   sudo deploy/install.sh [--prefix /opt/motion-studio] [--user motion] [--mem 4G] [--cpus 3]
#                          [--no-systemd] [--skip-apt] [--browsers-from DIR] [--dry-run]
# --browsers-from: reuse an existing Playwright browser directory (offline/air-gapped hosts) instead of downloading Chromium.
# Installs ONLY into --prefix, /var/lib/motion-studio, /etc/motion-studio.env, /usr/local/bin/bm and two systemd units
# named motion-studio-*. It opens no ports, touches no other service, container or database, and enables no publishing.
# Uninstall: deploy/uninstall.sh (keeps rendered videos unless --purge).
set -euo pipefail
SRC=$(cd "$(dirname "$0")/.." && pwd)
PREFIX=/opt/motion-studio; RUNUSER=motion; MEM=4G; CPUS=""; SYSTEMD=1; APT=1; DRY=0; BROWSERS_FROM=""
while (( $# )); do case $1 in
  --prefix) PREFIX=$2; shift 2;; --user) RUNUSER=$2; shift 2;; --mem) MEM=$2; shift 2;; --cpus) CPUS=$2; shift 2;;
  --no-systemd) SYSTEMD=0; shift;; --skip-apt) APT=0; shift;; --dry-run) DRY=1; shift;; --browsers-from) BROWSERS_FROM=$2; shift 2;; -h|--help) sed -n 2,9p "$0"; exit 0;;
  *) echo "unknown option $1"; exit 2;; esac; done
NCPU=$(nproc); CPUS=${CPUS:-$(( NCPU > 1 ? NCPU - 1 : 1 ))}; VAR=/var/lib/motion-studio
[[ $PREFIX == /* && $PREFIX != / ]] || { echo "--prefix must be an absolute path"; exit 2; }
run() { echo "+ $*"; (( DRY )) || "$@"; }
say() { printf '\n== %s\n' "$*"; }

say "plan: prefix=$PREFIX user=$RUNUSER cores=$CPUS/$NCPU mem=$MEM systemd=$SYSTEMD apt=$APT dry-run=$DRY"
(( DRY )) || [[ $EUID -eq 0 ]] || { echo "run as root (sudo), or use --dry-run"; exit 1; }

say "1/8 system packages (ffmpeg, python venv, node)"
if (( APT )); then
  run apt-get update -qq
  run env DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends ffmpeg python3-venv python3-pip curl bzip2 ca-certificates rsync util-linux nodejs npm
fi
command -v node >/dev/null && [[ $(node -p 'process.versions.node.split(".")[0]') -ge 18 ]] || { echo "Node.js >= 18 required (found: $(node -v 2>/dev/null || echo none))"; (( DRY )) || exit 1; }

say "2/8 service user"
id "$RUNUSER" >/dev/null 2>&1 || run useradd --system --home-dir "$VAR" --shell /usr/sbin/nologin "$RUNUSER"

say "3/8 copy studio -> $PREFIX (code only; no renders, no state)"
run mkdir -p "$PREFIX" "$VAR/var"
run rsync -a --delete --exclude 'projects/*/out/' --exclude 'projects/*.agent.*' --exclude 'projects/*.render.log' --exclude 'var/' \
    --exclude 'voices/' --exclude '.venv/' --exclude 'runtime/node_modules/' --exclude 'browsers/' --exclude '__pycache__/' \
    --exclude 'projects/' "$SRC/" "$PREFIX/"
run mkdir -p "$PREFIX/projects"
[[ -d "$SRC/projects" ]] && run rsync -a --ignore-existing --exclude '*/out/' --exclude '*.agent.*' --exclude '*.log' "$SRC/projects/" "$PREFIX/projects/"

say "4/8 Python runtime (private venv, pinned)"
run python3 -m venv "$PREFIX/.venv"
run "$PREFIX/.venv/bin/pip" install --quiet --disable-pip-version-check -r "$PREFIX/deploy/requirements.txt"

say "5/8 Node runtime + Chromium (pinned playwright 1.63.0, browsers inside the prefix)"
run mkdir -p "$PREFIX/runtime"; run cp "$PREFIX/deploy/package.json" "$PREFIX/deploy/package-lock.json" "$PREFIX/runtime/"
run bash -c "cd '$PREFIX/runtime' && npm ci --no-audit --no-fund --omit=dev"
if [[ -n $BROWSERS_FROM ]]; then run rm -rf "$PREFIX/browsers"; run ln -s "$(cd "$BROWSERS_FROM" && pwd)" "$PREFIX/browsers"
elif (( APT )); then run env PLAYWRIGHT_BROWSERS_PATH="$PREFIX/browsers" "$PREFIX/runtime/node_modules/.bin/playwright" install --with-deps chromium
else run env PLAYWRIGHT_BROWSERS_PATH="$PREFIX/browsers" "$PREFIX/runtime/node_modules/.bin/playwright" install chromium; fi

say "6/8 local voice model (free, CC BY 4.0 data)"
run "$PREFIX/tools/get-voices.sh"

say "7/8 config + CLI wrapper"
ENVF=/etc/motion-studio.env; (( SYSTEMD )) || ENVF="$PREFIX/motion-studio.env"
CONF="# Motion Studio runtime limits (read by /usr/local/bin/bm and the worker unit)
BM_HOME=$PREFIX
BM_VAR=$VAR/var
BM_MEM_MAX=$MEM
BM_CORES=$CPUS
BM_JOB_TIMEOUT=7200
BM_RETRIES=1
BM_RETENTION_DAYS=14
BM_PLAYWRIGHT=$PREFIX/runtime/node_modules/playwright
PLAYWRIGHT_BROWSERS_PATH=$PREFIX/browsers
PATH=$PREFIX/.venv/bin:/usr/local/bin:/usr/bin:/bin"
if (( DRY )); then echo "+ write $ENVF:"; echo "$CONF"; else [[ -f $ENVF ]] || echo "$CONF" > "$ENVF"; fi
WRAP="#!/usr/bin/env bash
# Motion Studio CLI wrapper (installed by deploy/install.sh)
set -a; . '$ENVF'; set +a
exec '$PREFIX/bin/bm' \"\$@\""
BIN=/usr/local/bin/bm; (( SYSTEMD )) || BIN="$PREFIX/bm"
if (( DRY )); then echo "+ write $BIN"; else echo "$WRAP" > "$BIN"; chmod 755 "$BIN"; fi
run chown -R "$RUNUSER:" "$VAR" "$PREFIX/projects"

say "8/8 systemd units (worker + daily cleanup) with hard resource limits"
if (( SYSTEMD )); then
  PCT=$(( CPUS * 100 ))
  UNIT="[Unit]
Description=Motion Studio render worker (CPU-only, one job at a time)
After=network.target

[Service]
Type=simple
User=$RUNUSER
EnvironmentFile=$ENVF
ExecStart=$PREFIX/bin/bm worker
Restart=on-failure
RestartSec=30
Nice=10
IOSchedulingClass=idle
CPUQuota=${PCT}%
MemoryMax=$MEM
MemorySwapMax=0
TasksMax=512
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=$PREFIX/projects $VAR
ProtectKernelTunables=yes
ProtectControlGroups=yes
RestrictSUIDSGID=yes

[Install]
WantedBy=multi-user.target"
  CLEAN="[Unit]
Description=Motion Studio cleanup (temp files, old jobs)
[Service]
Type=oneshot
User=$RUNUSER
EnvironmentFile=$ENVF
ExecStart=$PREFIX/bin/bm cleanup"
  TIMER="[Unit]
Description=Daily Motion Studio cleanup
[Timer]
OnCalendar=daily
RandomizedDelaySec=1h
Persistent=true
[Install]
WantedBy=timers.target"
  if (( DRY )); then echo "+ write motion-studio-worker.service, motion-studio-cleanup.{service,timer}"; echo "$UNIT"
  else
    echo "$UNIT" > /etc/systemd/system/motion-studio-worker.service
    echo "$CLEAN" > /etc/systemd/system/motion-studio-cleanup.service
    echo "$TIMER" > /etc/systemd/system/motion-studio-cleanup.timer
    systemctl daemon-reload; systemctl enable --now motion-studio-worker.service motion-studio-cleanup.timer
  fi
fi

say "health check"
if (( DRY )); then echo "+ $BIN health"; else "$BIN" health || true; fi
cat <<EOF

Installed. Try:
  echo '{"type":"render","project":"projects/crypto-crash","name":"crypto-crash"}' | $BIN submit
  $BIN list ;  $BIN result <job_id>
Brief jobs ("type":"brief") need the Claude Code CLI logged in for user $RUNUSER (operator's own plan):
  npm i -g @anthropic-ai/claude-code && sudo -u $RUNUSER -H claude    # one-time login; nothing is published automatically
EOF
