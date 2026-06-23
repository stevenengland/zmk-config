#!/usr/bin/env bash
# Runs once after the devcontainer is created.
set -euo pipefail

WORKSPACE="${PWD}"

# Take ownership of the bind-mounted workspace so builds can write firmware/.
if command -v chown >/dev/null 2>&1; then
  chown -R "$(id -u):$(id -g)" "${WORKSPACE}" 2>/dev/null || true
fi

# Ensure the tools build.sh and matrix parsing rely on are present.
command -v rg >/dev/null 2>&1 || echo "warning: ripgrep (rg) not found" >&2
python3 -c 'import yaml' 2>/dev/null || echo "warning: pyyaml not found" >&2

echo "post-create complete"
