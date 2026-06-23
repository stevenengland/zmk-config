#!/usr/bin/env bash
# Build ZMK firmware locally inside the devcontainer.
#
# Drives builds from build.yaml's `include` matrix so local builds stay in
# lockstep with CI. With no argument every matrix entry is built; with a
# shield-name argument only the matching entry is built. Each entry is compiled
# by invoking the zmk-build-arm container against the host Docker daemon,
# caching west dependencies in a named volume, and copying the resulting uf2
# into firmware/ at the repo root.
set -euo pipefail

# --- pinned build image -------------------------------------------------------
# Kept in lockstep with config/west.yml `revision`; upgrade both together.
ZMK_REVISION="v0.3"
BUILD_IMAGE="zmkfirmware/zmk-build-arm:${ZMK_REVISION}"

# --- paths -------------------------------------------------------------------
# Host bind mounts must derive from LOCAL_WORKSPACE_FOLDER (the host-side path),
# never from the in-container /workspaces/... path the daemon cannot resolve.
: "${LOCAL_WORKSPACE_FOLDER:?LOCAL_WORKSPACE_FOLDER must be set (devcontainer remoteEnv)}"
HOST_ROOT="${LOCAL_WORKSPACE_FOLDER}"
CONFIG_DIR="${HOST_ROOT}/config"
FIRMWARE_DIR="${HOST_ROOT}/firmware"
BUILD_YAML="${HOST_ROOT}/build.yaml"

# Single named volume caching the west workspace + Zephyr deps across builds.
WEST_VOLUME="zmk-config-west-cache"

# Optional single-target filter: a shield name from build.yaml. Empty means
# "build the whole matrix".
TARGET="${1:-}"

# --- matrix ------------------------------------------------------------------
# Emit one record per `include` entry, fields separated by the unit-separator
# control char (\x1f) so empty optional fields are preserved rather than
# collapsed by `read` (tab/space would merge consecutive empties):
#   board <US> shield <US> cmake-args <US> snippet <US> artifact-name
# artifact-name falls back to the shield name when absent.
parse_matrix() {
  python3 - "$BUILD_YAML" <<'PY'
import sys, yaml
with open(sys.argv[1]) as f:
    data = yaml.safe_load(f) or {}
for entry in data.get("include", []):
    board = str(entry.get("board", "") or "")
    shield = str(entry.get("shield", "") or "")
    cmake = str(entry.get("cmake-args", "") or "")
    snippet = str(entry.get("snippet", "") or "")
    artifact = str(entry.get("artifact-name", "") or "") or shield
    print("\x1f".join([board, shield, cmake, snippet, artifact]))
PY
}

MATRIX=$(parse_matrix)

valid_targets() { printf '%s\n' "$MATRIX" | cut -d$'\x1f' -f2 | grep -v '^$'; }

if [ -n "$TARGET" ] && ! valid_targets | grep -qxF "$TARGET"; then
  {
    echo "error: unknown shield '${TARGET}'. Valid targets:"
    valid_targets | sed 's/^/  - /'
  } >&2
  exit 1
fi

mkdir -p "${FIRMWARE_DIR}"

# --- build a single matrix entry ---------------------------------------------
# Build parameters cross into the container as env vars to avoid quoting the
# shield/board/snippet/cmake-args into the in-container bash -c string.
build_one() {
  local board="$1" shield="$2" cmake="$3" snippet="$4" artifact="$5"

  echo "Building ${artifact} (${board}/${shield}) with ${BUILD_IMAGE}..."

  docker run --rm \
    -v "${WEST_VOLUME}:/workspace" \
    -v "${CONFIG_DIR}:/config:ro" \
    -v "${FIRMWARE_DIR}:/firmware" \
    -e BOARD="${board}" \
    -e SHIELD="${shield}" \
    -e SNIPPET="${snippet}" \
    -e CMAKE_ARGS="${cmake}" \
    -e ARTIFACT="${artifact}" \
    -w /workspace \
    "${BUILD_IMAGE}" \
    bash -c '
      set -eu
      west init -l /config 2>/dev/null || true
      west update
      west zephyr-export 2>/dev/null || true
      snippet_arg=""
      [ -n "${SNIPPET}" ] && snippet_arg="-S ${SNIPPET}"
      west build -p -s zmk/app -b "${BOARD}" ${snippet_arg} -- \
        -DSHIELD="${SHIELD}" -DZMK_CONFIG=/config ${CMAKE_ARGS}
      cp build/zephyr/zmk.uf2 "/firmware/${ARTIFACT}.uf2"
    '

  echo "Wrote firmware/${artifact}.uf2"
}

# --- loop the matrix (filtered to TARGET when given) -------------------------
while IFS=$'\x1f' read -r board shield cmake snippet artifact; do
  [ -n "$shield" ] || continue
  if [ -n "$TARGET" ] && [ "$shield" != "$TARGET" ]; then
    continue
  fi
  build_one "$board" "$shield" "$cmake" "$snippet" "$artifact"
done <<< "$MATRIX"
