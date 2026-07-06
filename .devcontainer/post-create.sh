#!/usr/bin/env bash
# Runs once after the devcontainer is created.
set -euo pipefail

WORKSPACE="${PWD}"

# Take ownership of the bind-mounted workspace so builds can write firmware/.
if command -v chown >/dev/null 2>&1; then
  chown -R "$(id -u):$(id -g)" "${WORKSPACE}" 2>/dev/null || true
fi

# Ensure the tools build.sh and matrix parsing rely on are present. ripgrep is
# baked into the image but install it here too so the container is usable even
# when started from a base that lacks it.
if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) not found; installing..."
  apt-get update && apt-get install -y --no-install-recommends ripgrep
fi
python3 -c 'import yaml' 2>/dev/null || echo "warning: pyyaml not found" >&2

# Install the keymap-app node deps so a freshly created container is ready to
# work. Use npm ci to honour the committed lockfile, matching CI.
if [ -f "${WORKSPACE}/keymap-app/package-lock.json" ]; then
  echo "installing keymap-app node deps..."
  (cd "${WORKSPACE}/keymap-app" && npm ci)

  # Playwright browser binaries live outside node_modules (~/.cache/ms-playwright)
  # and aren't covered by npm ci, so fetch them explicitly. --with-deps also
  # apt-installs the system libs (libnspr, libatk, ...) missing from the slim
  # base image; playwright shells out via sudo since we run as non-root vscode.
  echo "installing Playwright browsers..."
  (cd "${WORKSPACE}/keymap-app" && npx playwright install --with-deps chromium)
fi

echo "post-create complete"
