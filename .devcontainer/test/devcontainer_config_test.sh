#!/usr/bin/env bash
# Static configuration tests for the dev container's tooling parity.
#
# These assert the declarative contract of devcontainer.json and
# docker-compose.yml without standing up a real container: shared agent-config
# volumes persist across rebuilds, the expected devcontainer features are
# declared, and the editor is wired for DeviceTree/C rather than Python.
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
DEVCONTAINER_JSON="$REPO_ROOT/.devcontainer/devcontainer.json"
COMPOSE_YML="$REPO_ROOT/.devcontainer/docker-compose.yml"

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "ok - $*"; }

# --- shared named volumes persist agent config across rebuilds ---------------
# Each volume must be declared with a fixed global name and attached to the
# devcontainer service so its contents survive container recreation.
python3 - "$COMPOSE_YML" <<'PY' || fail "shared agent-config volumes not mounted on the devcontainer service"
import sys, yaml
compose = yaml.safe_load(open(sys.argv[1]))
shared = {"claude-config", "copilot-config", "vscode-server"}

top = compose.get("volumes") or {}
for name in shared:
    spec = top.get(name)
    assert spec is not None, f"top-level volume {name} not declared"
    assert spec.get("name") == name, f"volume {name} lacks fixed global name"

services = compose.get("services") or {}
svc = next(iter(services.values()))
mounted = set()
for v in svc.get("volumes") or []:
    src = v.split(":", 1)[0] if isinstance(v, str) else v.get("source")
    mounted.add(src)
missing = shared - mounted
assert not missing, f"volumes not mounted on service: {sorted(missing)}"
PY
pass "shared volumes (claude-config, copilot-config, vscode-server) are mounted"

# --- devcontainer declares git, github-cli and node features -----------------
python3 - "$DEVCONTAINER_JSON" <<'PY' || fail "devcontainer.json must declare git, github-cli and node features"
import sys, json
cfg = json.load(open(sys.argv[1]))
feature_keys = " ".join(cfg.get("features", {}).keys())
for f in ("/git:", "/github-cli:", "/node:"):
    assert f in feature_keys, f"missing feature {f}"
PY
pass "devcontainer declares git, github-cli and node features"

# --- editor wired for DeviceTree/C, not Python -------------------------------
python3 - "$DEVCONTAINER_JSON" <<'PY' || fail "devcontainer.json extensions must cover DeviceTree/C and drop Python"
import sys, json
cfg = json.load(open(sys.argv[1]))
exts = cfg.get("customizations", {}).get("vscode", {}).get("extensions", [])
joined = " ".join(exts).lower()
assert "devicetree" in joined, "no DeviceTree extension listed"
assert "cpptools" in joined or "c++" in joined, "no C/C++ extension listed"
assert "python" not in joined, "Python extension must be removed"
PY
pass "editor extensions cover DeviceTree/C with Python removed"

echo "ALL TESTS PASSED"
