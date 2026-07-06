// `U+XXXX` legend input conversion (PRD decision: symbols stored as the glyph
// string). Plain text passes through untouched; only `U+`-prefixed input is
// interpreted as a Unicode scalar value and rejected when it is not one.

const CODEPOINT_PREFIX = /^U\+(.+)$/i;
const HEX = /^[0-9A-Fa-f]{1,6}$/;
const SURROGATE_LOW = 0xd800;
const SURROGATE_HIGH = 0xdfff;
const MAX_CODEPOINT = 0x10ffff;

export type Conversion =
  | { ok: true; glyph: string }
  | { ok: false; error: string };

/**
 * Convert a raw legend field value on commit. Text without a `U+` prefix is
 * returned verbatim; `U+XXXX` is converted to its glyph. Malformed hex,
 * out-of-range values, and surrogate halves yield an error the caller surfaces
 * on the status bar, leaving the slot unchanged.
 */
export function convertLegendInput(input: string): Conversion {
  const match = CODEPOINT_PREFIX.exec(input.trim());
  if (!match) return { ok: true, glyph: input };

  const hex = match[1];
  if (!HEX.test(hex)) {
    return { ok: false, error: `invalid codepoint: ${input.trim()}` };
  }

  const code = Number.parseInt(hex, 16);
  if (code > MAX_CODEPOINT || (code >= SURROGATE_LOW && code <= SURROGATE_HIGH)) {
    return { ok: false, error: `invalid codepoint: ${input.trim()}` };
  }

  return { ok: true, glyph: String.fromCodePoint(code) };
}
