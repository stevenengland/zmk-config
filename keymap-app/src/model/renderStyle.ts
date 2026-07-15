// Visual constants and geometry helpers shared by every surface that renders
// the board: the live canvas (Keycap/KeyboardCanvas) and the standalone SVG
// export. One copy means the two can never silently drift the way the legend
// font once did (canvas legends omitted the embedded family export already used).

import symbolFontUrl from "../assets/fonts/NotoSansSymbols2-Subset.woff2";
import symbols1FontUrl from "../assets/fonts/NotoSansSymbols-Subset.woff2";
import mathFontUrl from "../assets/fonts/NotoSansMath-Subset.woff2";
import notoSansFontUrl from "../assets/fonts/NotoSans-Subset.woff2";
import interRegularUrl from "../assets/fonts/Inter-Regular.woff2";
import interSemiBoldUrl from "../assets/fonts/Inter-SemiBold.woff2";
import monoRegularUrl from "../assets/fonts/JetBrainsMono-Regular.woff2";
import monoSemiBoldUrl from "../assets/fonts/JetBrainsMono-SemiBold.woff2";
import type { BoardElement } from "./geometry";

export const BACKGROUND = "#14171c";
export const KEY_FILL = "#2b2f36";
export const KEY_STROKE = "#4a505a";
export const ENCODER_FILL = "#1f2329";
export const ENCODER_STROKE = "#5a6270";
export const CORNER_RADIUS = 6;

// Bottom/right-only accent overlaid on a key's own stroke to read as a
// "bottom-heavy" physical bevel (docs/design/stitch.md Shapes: "2px
// bottom-heavy border ... without complex skeuomorphism") — outline-variant,
// the same token the UI chrome borders already use.
export const KEY_EDGE_ACCENT = "#3b494c";
export const KEY_EDGE_ACCENT_WIDTH = 2.5;

// Layer corner tick: the active layer's color stroked over the top-right
// border corner arc, leaving the cap's interior corner free for the
// behavior stack (see Keycap's `Legends`).
export const TICK_ARM_LENGTH = 7;

// No single Noto face carries every legend glyph: Symbols 2 has the keycap and
// modifier glyphs, Symbols the arrows, Math the operators, and the base Latin
// face the last few punctuation marks. LEGEND_FONT stacks them in the same
// order scripts/gen-font-subset.sh assigns codepoints to them, so the first
// family in the stack that can draw a glyph is the one that embeds it.
export const SYMBOL_FONT_FAMILY = "Noto Sans Symbols 2";
export const SYMBOLS1_FONT_FAMILY = "Noto Sans Symbols";
export const MATH_FONT_FAMILY = "Noto Sans Math";
export const NOTO_SANS_FONT_FAMILY = "Noto Sans Subset";
export const UI_FONT = `"Inter", system-ui, sans-serif`;
export const MONO_FONT = `"JetBrains Mono", monospace`;
export const LEGEND_FONT = `"${SYMBOL_FONT_FAMILY}", "${SYMBOLS1_FONT_FAMILY}", "${MATH_FONT_FAMILY}", "${NOTO_SANS_FONT_FAMILY}", "JetBrains Mono", monospace`;
export const LEGEND_COLOR = "#e5e2e1";
export const PRIMARY_SIZE = 18;
export const SUB_SIZE = 12;
export const PAD = 9;

// Every subset below is inlined by the build as a base64 data: URI (see
// assetsInlineLimit in vite.config.ts), so the single-file build is
// self-contained and both the symbol glyphs and the brand fonts render
// identically on any machine — on the live canvas, in the UI chrome, and in
// exported SVGs. Regenerate the woff2 with scripts/gen-font-subset.sh.
export const FONT_FACE_CSS = `@font-face {
  font-family: "${SYMBOL_FONT_FAMILY}";
  font-display: swap;
  src: url(${symbolFontUrl}) format("woff2");
}
@font-face {
  font-family: "${SYMBOLS1_FONT_FAMILY}";
  font-display: swap;
  src: url(${symbols1FontUrl}) format("woff2");
}
@font-face {
  font-family: "${MATH_FONT_FAMILY}";
  font-display: swap;
  src: url(${mathFontUrl}) format("woff2");
}
@font-face {
  font-family: "${NOTO_SANS_FONT_FAMILY}";
  font-display: swap;
  src: url(${notoSansFontUrl}) format("woff2");
}
@font-face {
  font-family: "Inter";
  font-weight: 400;
  font-display: swap;
  src: url(${interRegularUrl}) format("woff2");
}
@font-face {
  font-family: "Inter";
  font-weight: 600;
  font-display: swap;
  src: url(${interSemiBoldUrl}) format("woff2");
}
@font-face {
  font-family: "JetBrains Mono";
  font-weight: 400;
  font-display: swap;
  src: url(${monoRegularUrl}) format("woff2");
}
@font-face {
  font-family: "JetBrains Mono";
  font-weight: 600;
  font-display: swap;
  src: url(${monoSemiBoldUrl}) format("woff2");
}`;

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Bounding box for a board element's corner-legend anchors. */
export function boxOf(element: BoardElement): Box {
  const { x, y, w, h } = element;
  if (element.kind === "encoder") {
    const r = w / 2;
    return { left: x - r, top: y - r, right: x + r, bottom: y + r };
  }
  return { left: x, top: y, right: x + w, bottom: y + h };
}

/**
 * Traces just the bottom and right sides of a key's rounded rect (including
 * those two corners), for the bottom-heavy depth accent. Shared by the live
 * canvas (Keycap) and the standalone SVG export so the two never drift.
 */
export function keyEdgeAccentPath(box: Box, r: number = CORNER_RADIUS): string {
  const { left, top, right, bottom } = box;
  return `M ${right} ${top + r} L ${right} ${bottom - r} A ${r} ${r} 0 0 1 ${right - r} ${bottom} L ${left + r} ${bottom} A ${r} ${r} 0 0 1 ${left} ${bottom - r}`;
}

/**
 * Traces the top-right border corner arc, with straight arms extending along
 * each adjoining edge — the layer indicator's corner tick. Shared by the live
 * canvas (Keycap) and the standalone SVG export so the two never drift.
 */
export function layerTickPath(box: Box, r: number = CORNER_RADIUS): string {
  const { top, right } = box;
  return `M ${right - r - TICK_ARM_LENGTH} ${top} L ${right - r} ${top} A ${r} ${r} 0 0 1 ${right} ${top + r} L ${right} ${top + r + TICK_ARM_LENGTH}`;
}

// Homing bar: a short bar on a key's bottom edge in the same steel tone as
// the key stroke — a physical property, never a legend or layer color (see
// docs/design/behavior-legends.html "Homing marker"). Shared by the live
// canvas (Keycap) and the standalone SVG export so the two never drift.
export const HOMING_BAR_WIDTH = 12;
export const HOMING_BAR_HEIGHT = 2.5;
export const HOMING_BAR_RADIUS = 1.25;
export const HOMING_BAR_BOTTOM_INSET = 7;

export interface HomingBarRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

export function homingBarRect(box: Box): HomingBarRect {
  const { left, right, bottom } = box;
  return {
    x: (left + right) / 2 - HOMING_BAR_WIDTH / 2,
    y: bottom - HOMING_BAR_BOTTOM_INSET,
    width: HOMING_BAR_WIDTH,
    height: HOMING_BAR_HEIGHT,
    rx: HOMING_BAR_RADIUS,
  };
}

// Hold slot: top-right behavior stack, row one (docs/design/behavior-legends.html
// "hold slot"). Underline is a fixed-size bar rather than a text-bbox measurement
// so the live canvas (React SVG) and the standalone export (string SVG, no DOM)
// can never drift apart. Shared by the live canvas (Keycap) and the standalone
// SVG export.
export const HOLD_SIZE = 10.5;
export const HOLD_UNDERLINE_WIDTH = 10;
export const HOLD_UNDERLINE_HEIGHT = 1.6;
export const HOLD_UNDERLINE_RADIUS = 0.8;
export const HOLD_UNDERLINE_TOP_OFFSET = 13;

export interface HoldUnderlineRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

export function holdUnderlineRect(box: Box): HoldUnderlineRect {
  const { top, right } = box;
  return {
    x: right - PAD - HOLD_UNDERLINE_WIDTH,
    y: top + PAD + HOLD_UNDERLINE_TOP_OFFSET,
    width: HOLD_UNDERLINE_WIDTH,
    height: HOLD_UNDERLINE_HEIGHT,
    rx: HOLD_UNDERLINE_RADIUS,
  };
}

// Tap-dance rows: top-right behavior stack, below any hold row — one row per
// tap count (docs/design/behavior-legends.html "Tap dance"). Same size as the
// hold row; row height is a fixed step rather than a text-bbox measurement so
// the live canvas and the string-based SVG export can never drift apart.
export const TAP_SIZE = HOLD_SIZE;
export const TAP_ROW_HEIGHT = 14;
export const HOLD_ROW_HEIGHT = 16;

/** Hanging-baseline y for tap row `index`, offset below the hold row when present. */
export function tapRowY(box: Box, index: number, hasHold: boolean): number {
  return box.top + PAD + (hasHold ? HOLD_ROW_HEIGHT : 0) + index * TAP_ROW_HEIGHT;
}

// Macro chip: dashed border around the primary legend when it displays a
// macro's glyph (docs/design/behavior-legends.html "Macros") — "one unit
// that expands to a sequence". Sized from a fixed per-glyph advance and
// fixed ascent/descent rather than DOM-measured text metrics, so the live
// canvas and the string-based SVG export can never drift apart — same
// rationale as holdUnderlineRect above.
export const MACRO_GLYPH_ADVANCE = 11;
export const MACRO_CHIP_ASCENT = 13;
export const MACRO_CHIP_DESCENT = 3;
export const MACRO_CHIP_PAD_X = 3.5;
export const MACRO_CHIP_PAD_Y = 2.5;
export const MACRO_CHIP_RADIUS = 4;
export const MACRO_CHIP_STROKE = "#6b7480";
export const MACRO_CHIP_DASH = "3 2.2";

export interface MacroChipRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

export function macroChipRect(glyph: string, box: Box): MacroChipRect {
  const baselineX = box.left + PAD;
  const baselineY = box.bottom - PAD;
  // Count code points, not UTF-16 units, so an astral-plane macro glyph
  // (e.g. 📋 U+1F4CB, a surrogate pair) draws one unit wide, not two.
  const width = Math.max([...glyph].length, 1) * MACRO_GLYPH_ADVANCE;
  return {
    x: baselineX - MACRO_CHIP_PAD_X,
    y: baselineY - MACRO_CHIP_ASCENT - MACRO_CHIP_PAD_Y,
    width: width + 2 * MACRO_CHIP_PAD_X,
    height: MACRO_CHIP_ASCENT + MACRO_CHIP_DESCENT + 2 * MACRO_CHIP_PAD_Y,
    rx: MACRO_CHIP_RADIUS,
  };
}

const VIEWBOX_PADDING = 40;

/** Tight bounding box around every board element, plus padding. */
export function boardViewBox(
  elements: readonly BoardElement[],
): { x: number; y: number; width: number; height: number } {
  const minX = Math.min(...elements.map((e) => e.x));
  const minY = Math.min(...elements.map((e) => e.y));
  const maxX = Math.max(...elements.map((e) => e.x + e.w));
  const maxY = Math.max(...elements.map((e) => e.y + e.h));
  return {
    x: minX - VIEWBOX_PADDING,
    y: minY - VIEWBOX_PADDING,
    width: maxX - minX + 2 * VIEWBOX_PADDING,
    height: maxY - minY + 2 * VIEWBOX_PADDING,
  };
}
