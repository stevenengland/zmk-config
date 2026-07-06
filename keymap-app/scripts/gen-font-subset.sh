#!/usr/bin/env bash
#
# Regenerate the embedded Noto Sans Symbols 2 subset (woff2).
#
# The subset contains exactly the codepoints referenced by the curated symbol
# picker data (src/data/symbols.json), so the single-file build ships only the
# glyphs it can actually display. Latin characters in the data (e.g. German
# umlauts) are not part of Noto Sans Symbols 2; pyftsubset silently drops them
# and they fall back to the system font at render time.
#
# Prerequisites:
#   python3 with fonttools[woff] and brotli
#     pip install "fonttools>=4.0" brotli
#
# Usage (run from keymap-app/):
#   ./scripts/gen-font-subset.sh
#
# Regenerate whenever src/data/symbols.json gains new glyphs.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/src/data/symbols.json"
OUT_DIR="$ROOT/src/assets/fonts"
OUT="$OUT_DIR/NotoSansSymbols2-Subset.woff2"

# Pinned upstream source: Noto Sans Symbols 2, hinted Regular TTF.
SOURCE_URL="https://github.com/notofonts/notofonts.github.io/raw/main/fonts/NotoSansSymbols2/hinted/ttf/NotoSansSymbols2-Regular.ttf"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading source font..."
curl -sSL "$SOURCE_URL" -o "$TMP/source.ttf"

# Derive the comma-separated U+XXXX unicode list from the picker data.
UNICODES="$(python3 - "$DATA" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
codes = set()
for cat in data["categories"]:
    for sym in cat["symbols"]:
        for ch in sym:
            codes.add(ord(ch))
print(",".join("U+%04X" % c for c in sorted(codes)))
PY
)"

echo "Subsetting to: $UNICODES"
mkdir -p "$OUT_DIR"
pyftsubset "$TMP/source.ttf" \
  --unicodes="$UNICODES" \
  --flavor=woff2 \
  --layout-features='*' \
  --output-file="$OUT"

echo "Wrote $OUT"
