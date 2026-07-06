# Scripts

## `gen-font-subset.sh` — embedded font regeneration

Regenerates `src/assets/fonts/NotoSansSymbols2-Subset.woff2`, the subset of
[Noto Sans Symbols 2](https://github.com/notofonts/notofonts.github.io/tree/main/fonts/NotoSansSymbols2)
that ships inlined in the single-file build. The subset holds exactly the
codepoints referenced by the curated picker data in `src/data/symbols.json`, so
adding or removing glyphs there is the trigger to re-run this script.

### Prerequisites

```bash
pip install "fonttools>=4.0" brotli
```

`fonttools` provides `pyftsubset`; `brotli` is required for the `woff2` flavor.

### Run

```bash
cd keymap-app
./scripts/gen-font-subset.sh
```

The script downloads the pinned upstream Regular TTF, derives the `U+XXXX` list
from `symbols.json`, and writes the woff2 subset. Commit the regenerated file.

### Notes

- Latin characters present in the data (German umlauts, `€`, …) are not part of
  Noto Sans Symbols 2. `pyftsubset` drops them from the subset; at render time
  they fall back to the system font, which is the intended behavior — only the
  hard-to-find symbol glyphs need to be embedded.
- The build inlines the woff2 as a base64 `data:` URI (see `assetsInlineLimit`
  in `vite.config.ts`), so the subset must stay small. Keep the curated set
  tight.
