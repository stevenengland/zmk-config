#!/usr/bin/env bash
# Behavior tests for .devcontainer/build.sh.
#
# These run build.sh against a stub `docker` so the script's observable
# contract is verified without a real (multi-minute) ZMK firmware compile or a
# reachable Docker daemon. The stub records its invocation and simulates the
# build by writing a non-empty artifact into the bind-mounted firmware dir.
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
BUILD_SH="$REPO_ROOT/.devcontainer/build.sh"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "ok - $*"; }

# Fresh sandbox workspace standing in for the host-side checkout.
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/config" "$WORK/bin"
cp "$REPO_ROOT/config/west.yml" "$WORK/config/west.yml"
cp "$REPO_ROOT/build.yaml" "$WORK/build.yaml"

# Stub docker: logs argv, and on `run` simulates the in-container build by
# copying a fake zmk.uf2 into whichever host dir is mounted at /firmware.
cat > "$WORK/bin/docker" <<'STUB'
#!/usr/bin/env bash
echo "$@" >> "$DOCKER_LOG"
if [ "${1:-}" = "run" ]; then
  fw_host=""
  prev=""
  for a in "$@"; do
    case "$prev" in
      -v|--volume) case "$a" in *:/firmware*) fw_host="${a%%:/firmware*}";; esac;;
    esac
    prev="$a"
  done
  if [ -n "$fw_host" ]; then
    mkdir -p "$fw_host"
    printf 'FAKEUF2' > "$fw_host/sofle_left.uf2"
  fi
fi
exit 0
STUB
chmod +x "$WORK/bin/docker"

DOCKER_LOG="$WORK/docker.log"
export DOCKER_LOG
: > "$DOCKER_LOG"

# Run build.sh as if invoked from the repo root inside the devcontainer.
(
  cd "$WORK"
  PATH="$WORK/bin:$PATH" \
  LOCAL_WORKSPACE_FOLDER="$WORK" \
    bash "$BUILD_SH"
)

# AC: ./build.sh produces a non-empty firmware/sofle_left.uf2.
[ -s "$WORK/firmware/sofle_left.uf2" ] \
  || fail "expected non-empty firmware/sofle_left.uf2"
pass "produces non-empty firmware/sofle_left.uf2"

# AC: build runs inside zmkfirmware/zmk-build-arm via docker run, pinned to the
# west.yml revision (v0.3).
grep -Eq '^run( |.* )zmkfirmware/zmk-build-arm:v0\.3' "$DOCKER_LOG" \
  || grep -q 'zmkfirmware/zmk-build-arm:v0.3' "$DOCKER_LOG" \
  || fail "expected docker run of zmkfirmware/zmk-build-arm:v0.3"
grep -q '^run ' "$DOCKER_LOG" || fail "expected a 'docker run' invocation"
pass "invokes zmkfirmware/zmk-build-arm:v0.3 via docker run"

# AC: west dependencies are cached in a named Docker volume, not the throwaway
# container filesystem. A named volume is `-v name:/path` where name is not an
# absolute host path.
grep -Eq -- '-v[ =][a-z0-9][a-z0-9_.-]*:/' "$DOCKER_LOG" \
  || fail "expected a named volume mount for the west cache"
pass "mounts a named volume for the west cache"

# Convention: host bind mounts derive from LOCAL_WORKSPACE_FOLDER and never bind
# in-container /workspaces/... paths to the host daemon.
if grep -Eq -- '-v[ =]/workspaces/' "$DOCKER_LOG"; then
  fail "must not bind in-container /workspaces/... path to host daemon"
fi
grep -q "$WORK" "$DOCKER_LOG" \
  || fail "expected host mounts derived from LOCAL_WORKSPACE_FOLDER"
pass "host mounts derive from LOCAL_WORKSPACE_FOLDER"

echo "ALL TESTS PASSED"
