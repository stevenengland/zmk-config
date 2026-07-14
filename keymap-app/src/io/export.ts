// Standalone SVG + JSON export for the keymap board.
//
// SVG export serializes a layer as a self-contained document (board shapes,
// legends, and an embedded @font-face) so it renders identically when opened
// directly in a browser, independent of the app. JSON export reuses the same
// `serialize` the Save path uses, so the two never drift.

import { boardGeometry, type BoardElement } from "../model/geometry";
import {
  resolveHoldDisplay,
  resolveMacroDisplay,
  serialize,
  type HoldDisplay,
  type KeyLegend,
  type KeymapDocument,
  type Layer,
  type MacroRegistry,
} from "../model/schema";
import {
  BACKGROUND,
  boardViewBox,
  type Box,
  boxOf,
  CORNER_RADIUS,
  ENCODER_FILL,
  ENCODER_STROKE,
  FONT_FACE_CSS,
  HOLD_SIZE,
  holdUnderlineRect,
  homingBarRect,
  KEY_EDGE_ACCENT,
  KEY_EDGE_ACCENT_WIDTH,
  KEY_FILL,
  KEY_STROKE,
  keyEdgeAccentPath,
  layerTickPath,
  LEGEND_COLOR,
  LEGEND_FONT,
  macroChipRect,
  MACRO_CHIP_DASH,
  MACRO_CHIP_STROKE,
  PAD,
  PRIMARY_SIZE,
  SUB_SIZE,
} from "../model/renderStyle";

const viewBox = () => boardViewBox(boardGeometry);

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch]);
}

/** Corner legends, matching the on-canvas Keycap layout (primary/shifted/altgr). */
function legendMarkup(legend: KeyLegend, box: Box, macroGlyph?: string): string {
  const parts: string[] = [];
  if (legend.shifted) {
    parts.push(
      `<text x="${box.left + PAD}" y="${box.top + PAD}" text-anchor="start" dominant-baseline="hanging" font-family='${LEGEND_FONT}' font-size="${SUB_SIZE}" fill="${LEGEND_COLOR}">${escapeXml(legend.shifted)}</text>`,
    );
  }
  if (legend.altgr) {
    parts.push(
      `<text x="${box.right - PAD}" y="${box.bottom - PAD}" text-anchor="end" font-family='${LEGEND_FONT}' font-size="${SUB_SIZE}" fill="${LEGEND_COLOR}">${escapeXml(legend.altgr)}</text>`,
    );
  }
  const primaryText = macroGlyph ?? legend.primary;
  if (primaryText) {
    parts.push(
      `<text x="${box.left + PAD}" y="${box.bottom - PAD}" text-anchor="start" font-family='${LEGEND_FONT}' font-size="${PRIMARY_SIZE}" font-weight="600" fill="${legend.color ?? LEGEND_COLOR}">${escapeXml(primaryText)}</text>`,
    );
  }
  if (macroGlyph) {
    const r = macroChipRect(macroGlyph, box);
    parts.push(
      `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.rx}" fill="none" stroke="${MACRO_CHIP_STROKE}" stroke-width="1" stroke-dasharray="${MACRO_CHIP_DASH}" />`,
    );
  }
  return parts.join("");
}

/** Hold slot markup: glyph end-aligned top-right over a solid underline. Mirrors Keycap's `HoldRow`. */
function holdMarkup(display: HoldDisplay, box: Box): string {
  const r = holdUnderlineRect(box);
  const fill = display.color ?? LEGEND_COLOR;
  return (
    `<text x="${box.right - PAD}" y="${box.top + PAD}" text-anchor="end" dominant-baseline="hanging" font-family='${LEGEND_FONT}' font-size="${HOLD_SIZE}" fill="${fill}">${escapeXml(display.text)}</text>` +
    `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.rx}" fill="${fill}" />`
  );
}

/** Mirrors Keycap's bottom-heavy accent + per-key layer corner tick + homing bar + hold slot so exports never drift from the canvas. */
function elementMarkup(
  element: BoardElement,
  legend: KeyLegend | undefined,
  layerColor: string,
  homing: boolean,
  allLayers: readonly Layer[],
  macros: MacroRegistry,
): string {
  const box = boxOf(element);
  const shape =
    element.kind === "encoder"
      ? `<circle cx="${element.x}" cy="${element.y}" r="${element.w / 2}" fill="${ENCODER_FILL}" stroke="${ENCODER_STROKE}" stroke-width="2" />`
      : `<rect x="${element.x}" y="${element.y}" width="${element.w}" height="${element.h}" rx="${CORNER_RADIUS}" fill="${KEY_FILL}" stroke="${KEY_STROKE}" stroke-width="2" />`;
  const accent =
    element.kind === "key"
      ? `<path d="${keyEdgeAccentPath(box)}" fill="none" stroke="${KEY_EDGE_ACCENT}" stroke-width="${KEY_EDGE_ACCENT_WIDTH}" stroke-linecap="round" stroke-linejoin="round" />`
      : "";
  const tick =
    element.kind === "key"
      ? `<path d="${layerTickPath(box)}" fill="none" stroke="${layerColor}" stroke-width="${KEY_EDGE_ACCENT_WIDTH}" stroke-linecap="round" />`
      : "";
  const homingBar =
    element.kind === "key" && homing
      ? (() => {
          const r = homingBarRect(box);
          return `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.rx}" fill="${KEY_STROKE}" />`;
        })()
      : "";
  const holdDisplay = element.kind === "key" ? resolveHoldDisplay(legend?.hold, allLayers) : undefined;
  const hold = holdDisplay ? holdMarkup(holdDisplay, box) : "";
  const macroGlyph =
    element.kind === "key" ? resolveMacroDisplay(legend?.macro, macros)?.glyph : undefined;
  const cx = element.x + element.w / 2;
  const cy = element.y + element.h / 2;
  const transform =
    element.kind === "encoder" || element.rotation === undefined
      ? ""
      : ` transform="rotate(${element.rotation} ${cx} ${cy})"`;
  return `<g${transform}>${shape}${accent}${tick}${homingBar}${hold}${legend ? legendMarkup(legend, box, macroGlyph) : ""}</g>`;
}

/** Standalone SVG document for one layer: full board, legends, embedded font. */
export function layerToSvg(
  layer: Layer,
  homing: readonly string[] = [],
  allLayers: readonly Layer[] = [layer],
  macros: MacroRegistry = {},
): string {
  const box = viewBox();
  const homingSet = new Set(homing);
  const elements = boardGeometry
    .map((element) =>
      elementMarkup(
        element,
        layer.keys[element.id],
        layer.color,
        homingSet.has(element.id),
        allLayers,
        macros,
      ),
    )
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" width="${box.width}" height="${box.height}">` +
    `<style>${FONT_FACE_CSS}</style>` +
    `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" fill="${BACKGROUND}" />` +
    elements +
    `</svg>`
  );
}

function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Downloads the current layer as a standalone `<layer-name>.svg`. */
export function exportLayerSvg(
  layer: Layer,
  homing: readonly string[] = [],
  allLayers: readonly Layer[] = [layer],
  macros: MacroRegistry = {},
): void {
  downloadFile(layerToSvg(layer, homing, allLayers, macros), `${layer.name}.svg`, "image/svg+xml");
}

/** Sequential per-layer downloads, one `<layer-name>.svg` per layer — no zip dependency. */
export function exportAllLayersSvg(
  layers: readonly Layer[],
  homing: readonly string[] = [],
  macros: MacroRegistry = {},
): void {
  for (const layer of layers) {
    exportLayerSvg(layer, homing, layers, macros);
  }
}

const JSON_FILE_NAME = "keymap.json";

/** Downloads the document as JSON via the same serializer the Save path uses. */
export function exportJson(doc: KeymapDocument): void {
  downloadFile(serialize(doc), JSON_FILE_NAME, "application/json");
}
