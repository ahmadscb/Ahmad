#!/usr/bin/env bash
# Remove a Motion Studio install made by deploy/install.sh.
#   sudo deploy/uninstall.sh [--prefix /opt/motion-studio] [--user motion] [--purge] [--dry-run]
# Default keeps rendered videos and job history (moved to /var/lib/motion-studio/kept-projects); --purge deletes them too.
# Only removes what install.sh created; never touches other services.
set -euo pipefail
PREFIX=/opt/motion-studio; RUNUSER=motion; PURGE=0; DRY=0; VAR=/var/lib/motion-studio
while (( $# )); do case $1 in --prefix) PREFIX=$2; shift 2;; --user) RUNUSER=$2; shift 2;; --purge) PURGE=1; shift;; --dry-run) DRY=1; shift;; *) echo "unknown $1"; exit 2;; esac; done
[[ $PREFIX == /* && $PREFIX != / && -f $PREFIX/bin/bm ]] || { echo "no Motion Studio install at $PREFIX"; exit 1; }
run() { echo "+ $*"; (( DRY )) || "$@"; }
(( DRY )) || [[ $EUID -eq 0 ]] || { echo "run as root (sudo), or use --dry-run"; exit 1; }
if command -v systemctl >/dev/null && [[ -f /etc/systemd/system/motion-studio-worker.service ]]; then
  run systemctl disable --now motion-studio-worker.service motion-studio-cleanup.timer || true
  run rm -f /etc/systemd/system/motion-studio-worker.service /etc/systemd/system/motion-studio-cleanup.service /etc/systemd/system/motion-studio-cleanup.timer
  run systemctl daemon-reload
fi
if (( PURGE )); then run rm -rf "$VAR"
else run mkdir -p "$VAR/kept-projects"; run rsync -a "$PREFIX/projects/" "$VAR/kept-projects/"; echo "kept renders in $VAR/kept-projects"; fi
run rm -rf "$PREFIX"
grep -q "Motion Studio CLI wrapper" /usr/local/bin/bm 2>/dev/null && run rm -f /usr/local/bin/bm
(( PURGE )) && run rm -f /etc/motion-studio.env
if (( PURGE )) && id "$RUNUSER" >/dev/null 2>&1 && [[ $(id -u "$RUNUSER") -lt 1000 ]]; then run userdel "$RUNUSER"; fi
echo "Motion Studio removed."
