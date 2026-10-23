#!/usr/bin/env bash
# Installs Ponytail, Claude-Mem and Anthropic Agent Skills for Claude Code at user scope.
# Safe to re-run: existing marketplaces/plugins are skipped. Local-only memory, no cloud sync, no telemetry.
set -euo pipefail

command -v node >/dev/null && command -v npm >/dev/null && command -v claude >/dev/null \
  || { echo "Need node, npm and claude on PATH" >&2; exit 1; }

has_market() { claude plugin marketplace list 2>/dev/null | grep -q "> $1\$"; }
has_plugin() { claude plugin list 2>/dev/null | grep -q "> $1\$"; }

has_market ponytail || claude plugin marketplace add DietrichGebert/ponytail
has_market anthropic-agent-skills || claude plugin marketplace add anthropics/skills

for p in ponytail@ponytail document-skills@anthropic-agent-skills example-skills@anthropic-agent-skills; do
  has_plugin "$p" || claude plugin install "$p" --scope user
done
# Keep Ponytail's task ledger local: no webhook, no task names sent anywhere.
echo '{"ledger":"true","webhookUrl":"","webhookToken":"","sendNames":"false"}' \
  | claude plugin configure ponytail@ponytail --values-stdin

# Claude-Mem's official installer (also puts the `claude-mem` hook launcher in ~/.local/bin).
# --provider claude = memory runs on your own Claude Code login; skips the cmem.ai sign-in/trial.
if ! has_plugin claude-mem@thedotmack; then
  CLAUDE_MEM_ONLINE_OPTIN=false DO_NOT_TRACK=1 npx -y claude-mem@latest install --provider claude
fi
npx -y claude-mem@latest telemetry disable

# Redact secrets before storage and skip commands that tend to print them.
python3 - <<'EOF'
import json, os
p = os.path.expanduser('~/.claude-mem/settings.json')
d = json.load(open(p)) if os.path.exists(p) else {}
d.update({
    "CLAUDE_MEM_REDACT_ENABLED": "true",
    "CLAUDE_MEM_REDACT_GENERIC_ENABLED": "true",
    "CLAUDE_MEM_SKIP_BASH_PATTERNS": r"^\s*(env|printenv|export|set)\b|(cat|less|more|head|tail)\s+\S*(\.env|credentials|\.netrc|id_rsa|\.pem|\.key)\b|gcloud auth print|aws configure get|gh auth token",
})
os.makedirs(os.path.dirname(p), exist_ok=True)
json.dump(d, open(p, 'w'), indent=2)
EOF

PATH="$HOME/.local/bin:$PATH" npx -y claude-mem@latest start
PATH="$HOME/.local/bin:$PATH" npx -y claude-mem@latest doctor

# Global workflow instructions (don't overwrite an existing file).
[ -f "$HOME/.claude/CLAUDE.md" ] || cp "$(dirname "$0")/../claude/global-CLAUDE.md" "$HOME/.claude/CLAUDE.md"
