// Standalone SVG + JSON export for the keymap board.
//
// SVG export serializes a layer as a self-contained document (board shapes,
// legends, and an embedded @font-face) so it renders identically when opened
// directly in a browser, independent of the app. JSON export reuses the same
// `serialize` the Save path uses, so the two never drift.

import { boardGeometry, type BoardElement } from "../model/geometry";
import { serialize, type KeyLegend, type KeymapDocument, type Layer } from "../model/schema";
import {
  BACKGROUND,
  boardViewBox,
  type Box,
  boxOf,
  CORNER_RADIUS,
  ENCODER_FILL,
  ENCODER_STROKE,
  FONT_FACE_CSS,
  KEY_EDGE_ACCENT,
  KEY_EDGE_ACCENT_WIDTH,
  KEY_FILL,
  KEY_STROKE,
  keyEdgeAccentPath,
  LED_INSET,
  LED_RADIUS,
  LEGEND_COLOR,
  LEGEND_FONT,
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
function legendMarkup(legend: KeyLegend, box: Box): string {
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
  if (legend.primary) {
    parts.push(
      `<text x="${box.left + PAD}" y="${box.bottom - PAD}" text-anchor="start" font-family='${LEGEND_FONT}' font-size="${PRIMARY_SIZE}" font-weight="600" fill="${legend.color ?? LEGEND_COLOR}">${escapeXml(legend.primary)}</text>`,
    );
  }
  return parts.join("");
}

/** Mirrors Keycap's bottom-heavy accent + per-key layer LED so exports never drift from the canvas. */
function elementMarkup(element: BoardElement, legend: KeyLegend | undefined, layerColor: string): string {
  const box = boxOf(element);
  const shape =
    element.kind === "encoder"
      ? `<circle cx="${element.x}" cy="${element.y}" r="${element.w / 2}" fill="${ENCODER_FILL}" stroke="${ENCODER_STROKE}" stroke-width="2" />`
      : `<rect x="${element.x}" y="${element.y}" width="${element.w}" height="${element.h}" rx="${CORNER_RADIUS}" fill="${KEY_FILL}" stroke="${KEY_STROKE}" stroke-width="2" />`;
  const accent =
    element.kind === "key"
      ? `<path d="${keyEdgeAccentPath(box)}" fill="none" stroke="${KEY_EDGE_ACCENT}" stroke-width="${KEY_EDGE_ACCENT_WIDTH}" stroke-linecap="round" stroke-linejoin="round" />`
      : "";
  const led =
    element.kind === "key"
      ? `<circle cx="${box.right - LED_INSET}" cy="${box.top + LED_INSET}" r="${LED_RADIUS}" fill="${layerColor}" />`
      : "";
  const cx = element.x + element.w / 2;
  const cy = element.y + element.h / 2;
  const transform =
    element.kind === "encoder" || element.rotation === undefined
      ? ""
      : ` transform="rotate(${element.rotation} ${cx} ${cy})"`;
  return `<g${transform}>${shape}${accent}${led}${legend ? legendMarkup(legend, box) : ""}</g>`;
}

/** Standalone SVG document for one layer: full board, legends, embedded font. */
export function layerToSvg(layer: Layer): string {
  const box = viewBox();
  const elements = boardGeometry
    .map((element) => elementMarkup(element, layer.keys[element.id], layer.color))
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
export function exportLayerSvg(layer: Layer): void {
  downloadFile(layerToSvg(layer), `${layer.name}.svg`, "image/svg+xml");
}

/** Sequential per-layer downloads, one `<layer-name>.svg` per layer — no zip dependency. */
export function exportAllLayersSvg(layers: readonly Layer[]): void {
  for (const layer of layers) {
    exportLayerSvg(layer);
  }
}

const JSON_FILE_NAME = "keymap.json";

/** Downloads the document as JSON via the same serializer the Save path uses. */
export function exportJson(doc: KeymapDocument): void {
  downloadFile(serialize(doc), JSON_FILE_NAME, "application/json");
}
