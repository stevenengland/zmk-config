#!/usr/bin/env bash
#
# Regenerate every embedded font in src/assets/fonts/ (all woff2):
#
#   1. Noto Sans Symbols 2 — glyph subset derived from src/data/symbols.json,
#      so the single-file build ships only the curated symbol glyphs it can
#      display. Latin characters in the data (e.g. German umlauts) are not part
#      of Noto Sans Symbols 2; pyftsubset drops them and they fall back to the
#      system font at render time.
#   2. Inter (UI) and JetBrains Mono (legends/labels) — the two brand fonts from
#      docs/design/stitch.md, Regular + SemiBold. These are pulled pre-subset to
#      the Latin range from the pinned Fontsource CDN (already woff2), which is
#      why they need no pyftsubset pass. They are embedded app-globally and in
#      every exported SVG via FONT_FACE_CSS (src/model/renderStyle.ts) so the
#      canvas, UI, and exports render identically on any machine.
#
# All woff2 outputs are inlined by the build as base64 data: URIs
# (assetsInlineLimit in vite.config.ts), keeping the build single-file.
#
# Prerequisites:
#   python3 with fonttools[woff] and brotli
#     pip install "fonttools>=4.0" brotli
#   curl
#
# Usage (run from keymap-app/):
#   ./scripts/gen-font-subset.sh
#
# Regenerate the symbol subset whenever src/data/symbols.json gains new glyphs.

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

# --- Brand fonts: Inter + JetBrains Mono, Latin subset, Regular + SemiBold ---
# Pinned Fontsource CDN woff2 (already subset to the Latin range).
FONTSOURCE="https://cdn.jsdelivr.net/fontsource/fonts"
declare -A BRAND_FONTS=(
  ["Inter-Regular.woff2"]="$FONTSOURCE/inter@latest/latin-400-normal.woff2"
  ["Inter-SemiBold.woff2"]="$FONTSOURCE/inter@latest/latin-600-normal.woff2"
  ["JetBrainsMono-Regular.woff2"]="$FONTSOURCE/jetbrains-mono@latest/latin-400-normal.woff2"
  ["JetBrainsMono-SemiBold.woff2"]="$FONTSOURCE/jetbrains-mono@latest/latin-600-normal.woff2"
)
for name in "${!BRAND_FONTS[@]}"; do
  echo "Downloading $name..."
  curl -sSL "${BRAND_FONTS[$name]}" -o "$OUT_DIR/$name"
  echo "Wrote $OUT_DIR/$name"
done
