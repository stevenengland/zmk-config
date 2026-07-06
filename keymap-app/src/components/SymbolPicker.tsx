import type { CSSProperties } from "react";
import symbols from "../data/symbols.json";
import { FONT_FACE_CSS, SYMBOL_FONT_FAMILY } from "../model/renderStyle";

export { SYMBOL_FONT_FAMILY };

// Colors drawn from the "Engineering Chic" colorset (docs/design/stitch.md).
const OUTLINE_VARIANT = "#3b494c";
const ON_SURFACE = "#e5e2e1";
const ON_SURFACE_VARIANT = "#bac9cc";
const FIELD_BG = "#0e0e0e";
const TEAL = "#00e5ff";

// Curated symbol glyphs resolve against the inlined Noto Sans Symbols 2
// subset first, then fall back to the system font for any glyph the subset
// does not carry (e.g. Latin German extras).
const GLYPH_FONT_STACK = `"${SYMBOL_FONT_FAMILY}", "JetBrains Mono", system-ui, sans-serif`;

interface SymbolPickerProps {
  onInsert: (glyph: string) => void;
}

const heading: CSSProperties = {
  margin: "12px 0 6px",
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: ON_SURFACE_VARIANT,
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, 32px)",
  gap: 4,
};

const glyphButton: CSSProperties = {
  appearance: "none",
  width: 32,
  height: 32,
  background: FIELD_BG,
  border: `1px solid ${OUTLINE_VARIANT}`,
  borderRadius: 4,
  color: ON_SURFACE,
  fontFamily: GLYPH_FONT_STACK,
  fontSize: 16,
  lineHeight: 1,
  cursor: "pointer",
  outlineColor: TEAL,
};

/**
 * Curated Unicode symbol picker. Categories and glyphs are read from the
 * data file (`src/data/symbols.json`), so new entries appear without any code
 * change. Clicking a glyph emits it to `onInsert` for the editor to place in
 * the active legend slot.
 */
export function SymbolPicker({ onInsert }: SymbolPickerProps) {
  return (
    <section aria-label="Symbol picker">
      <style>{FONT_FACE_CSS}</style>
      {symbols.categories.map((category) => (
        <div key={category.id}>
          <h3 style={heading}>{category.name}</h3>
          <div style={grid}>
            {category.symbols.map((glyph) => (
              <button
                key={glyph}
                type="button"
                aria-label={`Insert ${glyph}`}
                style={glyphButton}
                onClick={() => onInsert(glyph)}
              >
                {glyph}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
