// Standalone SVG + JSON export for the keymap board.
//
// SVG export serializes a layer as a self-contained document (board shapes,
// legends, and an embedded @font-face) so it renders identically when opened
// directly in a browser, independent of the app. JSON export reuses the same
// `serialize` the Save path uses, so the two never drift.

import { boardGeometry, type BoardElement } from "../model/geometry";
import { serialize, type KeyLegend, type KeymapDocument, type Layer } from "../model/schema";
import fontUrl from "../assets/fonts/NotoSansSymbols2-Subset.woff2";

const PADDING = 40;
const BACKGROUND = "#14171c";
const KEY_FILL = "#2b2f36";
const KEY_STROKE = "#4a505a";
const ENCODER_FILL = "#1f2329";
const ENCODER_STROKE = "#5a6270";
const CORNER_RADIUS = 6;

// Legend text falls back through the embedded symbol subset first so glyphs
// inserted from the SymbolPicker render correctly with no app dependency.
const SYMBOL_FONT_FAMILY = "Noto Sans Symbols 2";
const LEGEND_FONT = `"${SYMBOL_FONT_FAMILY}", "JetBrains Mono", monospace`;
const LEGEND_COLOR = "#e5e2e1";
const PRIMARY_SIZE = 18;
const SUB_SIZE = 12;
const PAD = 9;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function boxOf(element: BoardElement): Box {
  const { x, y, w, h } = element;
  if (element.kind === "encoder") {
    const r = w / 2;
    return { left: x - r, top: y - r, right: x + r, bottom: y + r };
  }
  return { left: x, top: y, right: x + w, bottom: y + h };
}

function viewBox(): { x: number; y: number; width: number; height: number } {
  const minX = Math.min(...boardGeometry.map((e) => e.x));
  const minY = Math.min(...boardGeometry.map((e) => e.y));
  const maxX = Math.max(...boardGeometry.map((e) => e.x + e.w));
  const maxY = Math.max(...boardGeometry.map((e) => e.y + e.h));
  return {
    x: minX - PADDING,
    y: minY - PADDING,
    width: maxX - minX + 2 * PADDING,
    height: maxY - minY + 2 * PADDING,
  };
}

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

function elementMarkup(element: BoardElement, legend: KeyLegend | undefined): string {
  const box = boxOf(element);
  const shape =
    element.kind === "encoder"
      ? `<circle cx="${element.x}" cy="${element.y}" r="${element.w / 2}" fill="${ENCODER_FILL}" stroke="${ENCODER_STROKE}" stroke-width="2" />`
      : `<rect x="${element.x}" y="${element.y}" width="${element.w}" height="${element.h}" rx="${CORNER_RADIUS}" fill="${KEY_FILL}" stroke="${KEY_STROKE}" stroke-width="2" />`;
  const cx = element.x + element.w / 2;
  const cy = element.y + element.h / 2;
  const transform =
    element.kind === "encoder" || element.rotation === undefined
      ? ""
      : ` transform="rotate(${element.rotation} ${cx} ${cy})"`;
  return `<g${transform}>${shape}${legend ? legendMarkup(legend, box) : ""}</g>`;
}

/** Standalone SVG document for one layer: full board, legends, embedded font. */
export function layerToSvg(layer: Layer): string {
  const box = viewBox();
  const elements = boardGeometry
    .map((element) => elementMarkup(element, layer.keys[element.id]))
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" width="${box.width}" height="${box.height}">` +
    `<style>@font-face { font-family: "${SYMBOL_FONT_FAMILY}"; font-display: swap; src: url(${fontUrl}) format("woff2"); }</style>` +
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
