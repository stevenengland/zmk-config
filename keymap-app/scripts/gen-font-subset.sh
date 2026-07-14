#!/usr/bin/env bash
#
# Regenerate every embedded font in src/assets/fonts/ (all woff2):
#
#   1. The Noto symbol cascade — glyph subsets covering every codepoint in
#      src/data/symbols.json (the picker glyphs) and src/data/marks.json (the
#      behavior mark vocabulary: tap-count middot, toggle ring). No single Noto
#      face carries them all, so each codepoint is subsetted out of the first
#      source below that can draw it, and LEGEND_FONT stacks the families in
#      the same order.
#
#      The codepoints the produced woff2 files actually carry are written back
#      to src/assets/fonts/subset-coverage.json and asserted by
#      src/model/fontCoverage.test.ts — a legend whose codepoint no embedded
#      font carries renders as tofu in an exported SVG on a machine that does
#      not happen to have the font installed.
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
# Regenerate the symbol subset whenever src/data/symbols.json or
# src/data/marks.json gains new glyphs.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/src/data/symbols.json"
MARKS="$ROOT/src/data/marks.json"
OUT_DIR="$ROOT/src/assets/fonts"
COVERAGE="$OUT_DIR/subset-coverage.json"

# Pinned upstream sources, in fallback order. No single Noto face carries the
# whole picker: Symbols 2 has the keycap and modifier glyphs, Symbols has the
# arrows, Math has the operators, and a few punctuation marks (‡ ‰) only exist
# in the base Latin face. Each codepoint is subsetted out of the first source
# that can draw it, and LEGEND_FONT in src/model/renderStyle.ts stacks the
# resulting families in this same order.
NOTO="https://github.com/notofonts/notofonts.github.io/raw/main/fonts"
SYMBOL_SOURCES=(
  "NotoSansSymbols2-Subset.woff2|$NOTO/NotoSansSymbols2/hinted/ttf/NotoSansSymbols2-Regular.ttf"
  "NotoSansSymbols-Subset.woff2|$NOTO/NotoSansSymbols/hinted/ttf/NotoSansSymbols-Regular.ttf"
  "NotoSansMath-Subset.woff2|$NOTO/NotoSansMath/hinted/ttf/NotoSansMath-Regular.ttf"
  "NotoSans-Subset.woff2|$NOTO/NotoSans/hinted/ttf/NotoSans-Regular.ttf"
)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Every codepoint the app can render as a legend: the picker glyphs plus the
# behavior mark vocabulary.
WANTED="$(python3 - "$DATA" "$MARKS" <<'PY'
import json, sys
codes = set()
for cat in json.load(open(sys.argv[1], encoding="utf-8"))["categories"]:
    for sym in cat["symbols"]:
        codes.update(ord(ch) for ch in sym)
for mark in json.load(open(sys.argv[2], encoding="utf-8")).values():
    codes.update(ord(ch) for ch in mark)
print(" ".join(str(c) for c in sorted(codes)))
PY
)"

mkdir -p "$OUT_DIR"
REMAINING="$WANTED"

for entry in "${SYMBOL_SOURCES[@]}"; do
  NAME="${entry%%|*}"
  URL="${entry#*|}"
  [ -n "$REMAINING" ] || { echo "All glyphs assigned; skipping $NAME"; continue; }

  echo "Downloading ${NAME%-Subset.woff2}..."
  curl -sSL "$URL" -o "$TMP/source.ttf"

  # Assign this source the codepoints it can actually draw; the rest cascade on.
  ASSIGNED="$(python3 - "$TMP/source.ttf" "$REMAINING" <<'PY'
import sys
from fontTools.ttLib import TTFont
cmap = set(TTFont(sys.argv[1]).getBestCmap())
print(" ".join(c for c in sys.argv[2].split() if int(c) in cmap))
PY
)"
  REMAINING="$(python3 - "$REMAINING" "$ASSIGNED" <<'PY'
import sys
assigned = set(sys.argv[2].split())
print(" ".join(c for c in sys.argv[1].split() if c not in assigned))
PY
)"

  if [ -z "$ASSIGNED" ]; then
    echo "  $NAME covers nothing still missing — not embedding it"
    continue
  fi

  UNICODES="$(python3 -c 'import sys; print(",".join("U+%04X" % int(c) for c in sys.argv[1].split()))' "$ASSIGNED")"
  pyftsubset "$TMP/source.ttf" \
    --unicodes="$UNICODES" \
    --flavor=woff2 \
    --layout-features='*' \
    --output-file="$OUT_DIR/$NAME"
  echo "  Wrote $OUT_DIR/$NAME"
done

# Latin characters in the picker data (German umlauts and the like) are carried
# by the brand fonts below, so anything still unassigned here is a symbol no
# embedded font can draw — fontCoverage.test.ts fails on exactly that.
[ -z "$REMAINING" ] || echo "WARNING: no source font covers: $REMAINING"

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

# --- Coverage manifest ---
# Read the codepoints back out of every woff2 we just wrote. A legend glyph is
# only safe to render if some embedded font can draw it — the fallback stacks
# (LEGEND_FONT, MONO_FONT in src/model/renderStyle.ts) span the symbol font and
# the brand fonts, so coverage is per-font and the union is what matters.
# Asserted by src/model/fontCoverage.test.ts.
python3 - "$OUT_DIR" "$COVERAGE" <<'PY'
import json, pathlib, sys
from fontTools.ttLib import TTFont
out_dir = pathlib.Path(sys.argv[1])
fonts = {
    path.name: sorted(TTFont(path).getBestCmap())
    for path in sorted(out_dir.glob("*.woff2"))
}
with open(sys.argv[2], "w", encoding="utf-8") as f:
    json.dump({"fonts": fonts}, f, indent=2)
    f.write("\n")
for name, codepoints in fonts.items():
    print("  %s: %d codepoints" % (name, len(codepoints)))
print("Wrote %s" % sys.argv[2])
PY
