#!/usr/bin/env bash
# Behavior tests for .devcontainer/build.sh.
#
# These run build.sh against a stub `docker` so the script's observable
# contract is verified without a real (multi-minute) ZMK firmware compile or a
# reachable Docker daemon. The stub records its invocation and simulates the
# build by writing a non-empty artifact (named after the ARTIFACT env it is
# handed) into the bind-mounted firmware dir.
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

# Stub docker: logs argv, and on `run` simulates the in-container build by
# copying a fake zmk.uf2 into whichever host dir is mounted at /firmware, named
# after the ARTIFACT env the script passes in.
cat > "$WORK/bin/docker" <<'STUB'
#!/usr/bin/env bash
echo "$@" >> "$DOCKER_LOG"
if [ "${1:-}" = "run" ]; then
  fw_host=""
  artifact=""
  prev=""
  for a in "$@"; do
    case "$prev" in
      -v|--volume) case "$a" in *:/firmware*) fw_host="${a%%:/firmware*}";; esac;;
      -e|--env)    case "$a" in ARTIFACT=*)   artifact="${a#ARTIFACT=}";; esac;;
    esac
    prev="$a"
  done
  if [ -n "$fw_host" ] && [ -n "$artifact" ]; then
    mkdir -p "$fw_host"
    printf 'FAKEUF2' > "$fw_host/$artifact.uf2"
  fi
fi
exit 0
STUB
chmod +x "$WORK/bin/docker"

DOCKER_LOG="$WORK/docker.log"
export DOCKER_LOG

# run_build <build.yaml-content-or-empty> [args...]
# Resets the firmware dir and docker log, installs the given build.yaml (or the
# repo's when empty), and runs build.sh from the workspace root. Returns the
# script's exit status.
run_build() {
  local yaml="$1"; shift
  : > "$DOCKER_LOG"
  rm -rf "$WORK/firmware"
  if [ -n "$yaml" ]; then
    printf '%s\n' "$yaml" > "$WORK/build.yaml"
  else
    cp "$REPO_ROOT/build.yaml" "$WORK/build.yaml"
  fi
  (
    cd "$WORK"
    PATH="$WORK/bin:$PATH" \
    LOCAL_WORKSPACE_FOLDER="$WORK" \
      bash "$BUILD_SH" "$@"
  )
}

# --- no argument builds the whole build.yaml matrix --------------------------
run_build "" || fail "build.sh (no arg) exited non-zero"
[ -s "$WORK/firmware/sofle_left.uf2" ] \
  || fail "expected non-empty firmware/sofle_left.uf2"
[ -s "$WORK/firmware/sofle_right.uf2" ] \
  || fail "expected non-empty firmware/sofle_right.uf2"
pass "no argument builds the whole matrix (sofle_left + sofle_right)"

# Slice 1 conventions still hold for the matrix builds: pinned image via docker
# run, named volume for the west cache, host mounts from LOCAL_WORKSPACE_FOLDER,
# and never a /workspaces bind to the host daemon.
grep -q 'zmkfirmware/zmk-build-arm:v0.3' "$DOCKER_LOG" \
  || fail "expected docker run of zmkfirmware/zmk-build-arm:v0.3"
grep -q '^run ' "$DOCKER_LOG" || fail "expected a 'docker run' invocation"
grep -Eq -- '-v[ =][a-z0-9][a-z0-9_.-]*:/' "$DOCKER_LOG" \
  || fail "expected a named volume mount for the west cache"
if grep -Eq -- '-v[ =]/workspaces/' "$DOCKER_LOG"; then
  fail "must not bind in-container /workspaces/... path to host daemon"
fi
grep -q "$WORK" "$DOCKER_LOG" \
  || fail "expected host mounts derived from LOCAL_WORKSPACE_FOLDER"
pass "matrix builds keep slice 1 conventions (pinned image, named volume, host mounts)"

# --- a shield argument builds only that entry --------------------------------
run_build "" sofle_left || fail "build.sh sofle_left exited non-zero"
[ -s "$WORK/firmware/sofle_left.uf2" ] \
  || fail "expected firmware/sofle_left.uf2 for single-target build"
[ -e "$WORK/firmware/sofle_right.uf2" ] \
  && fail "single-target build must not produce sofle_right.uf2"
pass "shield argument builds only that entry"

# --- optional build.yaml fields are passed through ---------------------------
OPT_YAML='include:
  - board: nice_nano_v2
    shield: sofle_left
    snippet: studio-rpc-usb-uart
    cmake-args: -DCONFIG_ZMK_STUDIO=y
    artifact-name: sofle_left_studio'
run_build "$OPT_YAML" sofle_left || fail "build.sh with optional fields exited non-zero"
[ -s "$WORK/firmware/sofle_left_studio.uf2" ] \
  || fail "artifact-name must drive output naming (sofle_left_studio.uf2)"
grep -q 'studio-rpc-usb-uart' "$DOCKER_LOG" \
  || fail "snippet must be passed through to the build"
grep -q 'DCONFIG_ZMK_STUDIO=y' "$DOCKER_LOG" \
  || fail "cmake-args must be passed through to the build"
pass "optional fields (snippet, cmake-args, artifact-name) are passed through"

# --- unknown shield exits non-zero with a clear, listing message -------------
if err=$(run_build "" no_such_shield 2>&1 1>/dev/null); then
  fail "unknown shield argument must exit non-zero"
fi
echo "$err" | grep -q 'sofle_left' \
  || fail "unknown-shield error must list valid targets"
echo "$err" | grep -q 'sofle_right' \
  || fail "unknown-shield error must list valid targets"
pass "unknown shield exits non-zero and lists valid targets"

echo "ALL TESTS PASSED"
