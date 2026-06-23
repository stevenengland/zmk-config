#!/usr/bin/env bash
# Behavior test for .devcontainer/post-create.sh.
#
# Verifies post-create actively *ensures* ripgrep rather than merely warning:
# with rg absent from PATH, the script must install it (here via a stubbed
# apt-get) so rg resolves afterwards.
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
POST_CREATE="$REPO_ROOT/.devcontainer/post-create.sh"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "ok - $*"; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/bin"

# Stub apt-get: on `install ... ripgrep`, drop a fake rg onto the stubbed PATH
# so the post-create check sees ripgrep become available.
cat > "$WORK/bin/apt-get" <<STUB
#!/usr/bin/env bash
echo "apt-get \$*" >> "$WORK/apt.log"
for a in "\$@"; do
  if [ "\$a" = "ripgrep" ]; then
    printf '#!/usr/bin/env bash\necho ripgrep\n' > "$WORK/bin/rg"
    chmod +x "$WORK/bin/rg"
  fi
done
exit 0
STUB
chmod +x "$WORK/bin/apt-get"

# A minimal sandbox PATH: the stubs plus coreutils, but deliberately no rg.
SANDBOX_PATH="$WORK/bin:/usr/bin:/bin"

command -v rg >/dev/null 2>&1 && [ -x "$WORK/bin/rg" ] \
  && fail "test setup error: rg should be absent before the run"

(
  cd "$WORK"
  PATH="$SANDBOX_PATH" bash "$POST_CREATE"
) || fail "post-create.sh exited non-zero"

grep -q 'ripgrep' "$WORK/apt.log" \
  || fail "post-create must install ripgrep when it is missing"
[ -x "$WORK/bin/rg" ] \
  || fail "ripgrep must be available after post-create runs"
pass "post-create installs ripgrep when missing"

echo "ALL TESTS PASSED"
