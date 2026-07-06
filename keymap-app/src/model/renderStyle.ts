// Visual constants and geometry helpers shared by every surface that renders
// the board: the live canvas (Keycap/KeyboardCanvas) and the standalone SVG
// export. One copy means the two can never silently drift the way the legend
// font once did (canvas legends omitted the embedded family export already used).

import fontUrl from "../assets/fonts/NotoSansSymbols2-Subset.woff2";
import type { BoardElement } from "./geometry";

export const BACKGROUND = "#14171c";
export const KEY_FILL = "#2b2f36";
export const KEY_STROKE = "#4a505a";
export const ENCODER_FILL = "#1f2329";
export const ENCODER_STROKE = "#5a6270";
export const CORNER_RADIUS = 6;

export const SYMBOL_FONT_FAMILY = "Noto Sans Symbols 2";
export const LEGEND_FONT = `"${SYMBOL_FONT_FAMILY}", "JetBrains Mono", monospace`;
export const LEGEND_COLOR = "#e5e2e1";
export const PRIMARY_SIZE = 18;
export const SUB_SIZE = 12;
export const PAD = 9;

// The subset is inlined by the build as a base64 data: URI (see
// assetsInlineLimit in vite.config.ts), so the single-file build is
// self-contained and the glyphs render identically on any machine.
export const FONT_FACE_CSS = `@font-face {
  font-family: "${SYMBOL_FONT_FAMILY}";
  font-display: swap;
  src: url(${fontUrl}) format("woff2");
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
