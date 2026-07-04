#!/usr/bin/env bash
# Build ZMK firmware locally inside the devcontainer.
#
# Drives builds from build.yaml's `include` matrix so local builds stay in
# lockstep with CI. Each entry is compiled by invoking the zmk-build-arm
# container against the host Docker daemon, caching west dependencies in a named
# volume, and copying the resulting uf2 into firmware/ at the repo root.
#
# Usage:
#   .devcontainer/build.sh [SHIELD]
#
# Arguments:
#   SHIELD   (optional) A shield name from build.yaml's `include` matrix
#            (e.g. sofle_left, sofle_right). Builds only that entry.
#            Omit to build every matrix entry. An unknown SHIELD exits non-zero
#            and prints the list of valid targets.
#
# Environment:
#   LOCAL_WORKSPACE_FOLDER   (required) Host path of the repo. The devcontainer
#            injects it via remoteEnv; it is the mount SOURCE for docker-outside-
#            of-docker (must be the host path, not /workspaces/...). The script
#            aborts if it is unset.
#
# Output:
#   firmware/<artifact>.uf2  where <artifact> is the entry's artifact-name, or
#            its shield name when artifact-name is absent. firmware/ is gitignored.
#
# Examples:
#   .devcontainer/build.sh                # build the whole matrix
#   .devcontainer/build.sh sofle_left     # build only the sofle_left entry
#
# Notes:
#   First run fetches + caches all west deps (zmk, zephyr, modules) into the
#   zmk-config-west-cache Docker volume; later runs skip the fetch and just
#   recompile.
set -euo pipefail

# --- pinned build image -------------------------------------------------------
# Use the SAME tag the CI reusable workflow uses (build-user-config.yml@v0.3 ->
# zmkfirmware/zmk-build-arm:stable). The image is only a toolchain provider (SDK,
# cmake, host tools); the actual Zephyr/ZMK *source* is fetched by west per
# config/west.yml, so the image tag is decoupled from the ZMK/Zephyr revision.
# Do NOT switch to a per-Zephyr tag like `3.5-branch`: those currently ship
# cmake 4.x, which breaks the Zephyr 3.5 Kconfig ("Aborting due to Kconfig
# warnings"). `stable` is what CI builds green against, so match it.
BUILD_IMAGE="zmkfirmware/zmk-build-arm:stable"

# --- paths -------------------------------------------------------------------
# Two namespaces, because docker runs against the HOST daemon (docker-outside-
# of-docker):
#   * Files the script reads/creates itself run IN the container -> derive from
#     CONTAINER_ROOT (the script's own location), the only path that resolves
#     here.
#   * `docker run -v` mount SOURCES are resolved by the host daemon -> must be
#     HOST_ROOT (LOCAL_WORKSPACE_FOLDER), never the /workspaces/... path.
# The repo is bind-mounted, so both roots point at the same files.
CONTAINER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${LOCAL_WORKSPACE_FOLDER:?LOCAL_WORKSPACE_FOLDER must be set (devcontainer remoteEnv)}"
HOST_ROOT="${LOCAL_WORKSPACE_FOLDER}"

# Host-side mount sources (consumed by `docker run -v`).
HOST_CONFIG_DIR="${HOST_ROOT}/config"
HOST_FIRMWARE_DIR="${HOST_ROOT}/firmware"

# In-container paths (read/created by this script directly).
BUILD_YAML="${CONTAINER_ROOT}/build.yaml"
FIRMWARE_DIR="${CONTAINER_ROOT}/firmware"

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

  # The config repo mounts *inside* the west volume at /workspace/config, not at
  # a top-level /config. `west init -l DIR` sets the workspace topdir to DIR's
  # parent, so the manifest repo must live under /workspace for zmk/zephyr/modules
  # (and .west) to land in the cached volume rather than the container's ephemeral
  # root -- otherwise every build re-fetches from scratch and the cache stays empty.
  docker run --rm \
    -v "${WEST_VOLUME}:/workspace" \
    -v "${HOST_CONFIG_DIR}:/workspace/config:ro" \
    -v "${HOST_FIRMWARE_DIR}:/firmware" \
    -e BOARD="${board}" \
    -e SHIELD="${shield}" \
    -e SNIPPET="${snippet}" \
    -e CMAKE_ARGS="${cmake}" \
    -e ARTIFACT="${artifact}" \
    -w /workspace \
    "${BUILD_IMAGE}" \
    bash -c '
      set -eu
      # -l config resolves against the /workspace workdir -> topdir /workspace.
      # Re-init on a warm cache is a no-op error, hence || true.
      west init -l config 2>/dev/null || true
      # Plain west update (like CI): respects the per-project clone-depth from the
      # manifest (zephyr is already depth-1 there). Do NOT force -o=--depth=1 --
      # that shallow-fetches SHA-pinned modules (zcbor, uoscore-uedhoc,
      # trusted-firmware-a) which reject shallow-by-SHA -> "update failed".
      west update
      west zephyr-export 2>/dev/null || true
      snippet_arg=""
      [ -n "${SNIPPET}" ] && snippet_arg="-S ${SNIPPET}"
      west build -p -s zmk/app -b "${BOARD}" ${snippet_arg} -- \
        -DSHIELD="${SHIELD}" -DZMK_CONFIG=/workspace/config ${CMAKE_ARGS}
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
