#!/usr/bin/env bash
# Build ZMK firmware locally inside the devcontainer.
#
# Slice 1 (tracer): builds one hardcoded target (sofle_left) end-to-end by
# invoking the zmk-build-arm container against the host Docker daemon, caching
# west dependencies in a named volume, and copying the resulting uf2 into
# firmware/ at the repo root. Matrix parsing from build.yaml arrives in slice 2.
set -euo pipefail

# --- pinned build image -------------------------------------------------------
# Kept in lockstep with config/west.yml `revision`; upgrade both together.
ZMK_REVISION="v0.3"
BUILD_IMAGE="zmkfirmware/zmk-build-arm:${ZMK_REVISION}"

# --- hardcoded target (slice 1) ----------------------------------------------
BOARD="nice_nano_v2"
SHIELD="sofle_left"
ARTIFACT="sofle_left"

# --- paths -------------------------------------------------------------------
# Host bind mounts must derive from LOCAL_WORKSPACE_FOLDER (the host-side path),
# never from the in-container /workspaces/... path the daemon cannot resolve.
: "${LOCAL_WORKSPACE_FOLDER:?LOCAL_WORKSPACE_FOLDER must be set (devcontainer remoteEnv)}"
HOST_ROOT="${LOCAL_WORKSPACE_FOLDER}"
CONFIG_DIR="${HOST_ROOT}/config"
FIRMWARE_DIR="${HOST_ROOT}/firmware"

# Single named volume caching the west workspace + Zephyr deps across builds.
WEST_VOLUME="zmk-config-west-cache"

mkdir -p "${FIRMWARE_DIR}"

echo "Building ${SHIELD} (${BOARD}) with ${BUILD_IMAGE}..."

docker run --rm \
  -v "${WEST_VOLUME}:/workspace" \
  -v "${CONFIG_DIR}:/config:ro" \
  -v "${FIRMWARE_DIR}:/firmware" \
  -w /workspace \
  "${BUILD_IMAGE}" \
  bash -c '
    set -eu
    west init -l /config 2>/dev/null || true
    west update
    west zephyr-export 2>/dev/null || true
    west build -p -s zmk/app -b '"${BOARD}"' -- \
      -DSHIELD='"${SHIELD}"' -DZMK_CONFIG=/config
    cp build/zephyr/zmk.uf2 /firmware/'"${ARTIFACT}"'.uf2
  '

echo "Wrote firmware/${ARTIFACT}.uf2"
