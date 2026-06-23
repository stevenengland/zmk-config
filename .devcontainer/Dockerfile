# Lightweight dev shell for driving local ZMK builds. The heavy toolchain lives
# in the zmk-build-arm container that build.sh launches against the host daemon;
# this image only needs the docker CLI, a YAML parser (for build.yaml matrix
# parsing in slice 2), and ripgrep.
FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        ripgrep \
    && curl -fsSL https://get.docker.com | sh \
    && pip install --no-cache-dir pyyaml \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspaces/zmk-config
