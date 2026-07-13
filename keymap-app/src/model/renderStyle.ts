// Visual constants and geometry helpers shared by every surface that renders
// the board: the live canvas (Keycap/KeyboardCanvas) and the standalone SVG
// export. One copy means the two can never silently drift the way the legend
// font once did (canvas legends omitted the embedded family export already used).

import symbolFontUrl from "../assets/fonts/NotoSansSymbols2-Subset.woff2";
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

export const SYMBOL_FONT_FAMILY = "Noto Sans Symbols 2";
export const UI_FONT = `"Inter", system-ui, sans-serif`;
export const MONO_FONT = `"JetBrains Mono", monospace`;
export const LEGEND_FONT = `"${SYMBOL_FONT_FAMILY}", "JetBrains Mono", monospace`;
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
