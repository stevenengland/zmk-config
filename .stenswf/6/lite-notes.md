# Lite Notes — #6

## Assumptions (plan-light)

## Assumptions (ship-light)

- "Insert" sets the active legend slot to the clicked glyph (legends are single-glyph), rather than appending at a cursor position.
- The active slot follows field focus and defaults to `primary` before any field is focused.
- Latin entries in the picker data (German umlauts, `€`) are not part of Noto Sans Symbols 2; `pyftsubset` drops them and they fall back to the system font — only hard-to-find symbol glyphs are embedded.
- The woff2 subset is inlined into the single-file build as a base64 `data:` URI via `assetsInlineLimit: MAX_SAFE_INTEGER`, keeping the build free of external asset references.
