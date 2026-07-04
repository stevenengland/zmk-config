# dev shell for driving local ZMK builds. The heavy toolchain lives
# in the zmk-build-arm container that build.sh launches against the host daemon;
# this image only needs the docker CLI, a YAML parser (for build.yaml matrix
# parsing in slice 2), and ripgrep.
# Use the official Python 3.12 image
FROM mcr.microsoft.com/devcontainers/python:3.12-bookworm

# Pre-seed so Docker initializes the volume with correct ownership
RUN mkdir -p /home/vscode/.vscode-server /home/vscode/.claude /home/vscode/.copilot \
    && chown -R vscode:vscode /home/vscode/.vscode-server /home/vscode/.claude /home/vscode/.copilot

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Proxy build args — empty by default (CI-safe)
ARG http_proxy=""
ARG https_proxy=""

# Write apt proxy config if a proxy is provided; survives sudo at runtime
RUN if [ -n "$http_proxy" ]; then \
      printf 'Acquire::http::Proxy "%s/";\nAcquire::https::Proxy "%s/";\n' \
        "$http_proxy" "$https_proxy" \
        > /etc/apt/apt.conf.d/99proxy; \
    fi

# Remove Yarn repo if not needed, OR fix the GPG key
RUN rm -f /etc/apt/sources.list.d/yarn.list || true

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        ripgrep \
    && pip install --no-cache-dir pyyaml \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*


# Create workspace directory
WORKDIR /workspaces/zmk-config

# Copy the rest of the project files (excluding files in .dockerignore)
# Mounted in via "volumes: - ..:/workspace:cached" in docker compose
# COPY . .

# Create a non-root user (if not already created by base image)
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Set up git (global configuration)
RUN git config --global init.defaultBranch main

# Switch to non-root user
USER $USERNAME

