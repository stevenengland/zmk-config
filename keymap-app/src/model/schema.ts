// Persisted keymap document model (PRD decision: top-level
// `{ schemaVersion: 2, board, layers }`). Unset legend slots are never
// persisted as empty strings — they are omitted from the JSON entirely.
// `parse` accepts schemaVersion 1 and 2 and upgrades v1 in memory;
// `serialize` always emits the current version.

export const SCHEMA_VERSION = 2;

const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1, SCHEMA_VERSION];

/**
 * Legends for a single key. `primary` renders larger (bottom-left) and may
 * carry its own `color`; `shifted` (top-left) and `altgr` (bottom-right) are
 * plain glyphs. Every slot is optional and omitted when unset.
 */
/** Hold-tap in glyph mode: tap `primary`, hold `glyph`, Shift+hold `shifted` (tooltip-only). */
export interface GlyphHoldBinding {
  glyph: string;
  shifted?: string;
}

/** Layer-tap: hold moves to the named layer; glyph and tint are derived from it, always in sync. */
export interface LayerHoldBinding {
  layer: string;
}

export type HoldBinding = GlyphHoldBinding | LayerHoldBinding;

export function isLayerHold(hold: HoldBinding): hold is LayerHoldBinding {
  return "layer" in hold;
}

export interface KeyLegend {
  primary?: string;
  shifted?: string;
  altgr?: string;
  color?: string;
  hold?: HoldBinding;
}

export interface Layer {
  name: string;
  color: string;
  keys: Record<string, KeyLegend>;
}

/** Board-wide physical properties, outside `layers` since they apply to every layer. */
export interface Board {
  homing?: string[];
}

export interface KeymapDocument {
  schemaVersion: typeof SCHEMA_VERSION;
  board?: Board;
  layers: Layer[];
}

/** What a hold slot renders, resolved against the document's layers. */
export interface HoldDisplay {
  text: string;
  /** Set only for a layer-tap hold: the target layer's tint and jump target. */
  layerName?: string;
  color?: string;
}

/**
 * Resolves a hold binding to what the hold slot renders: a layer-tap shows
 * the target layer's name tinted in its color; a glyph hold shows its glyph
 * untinted. Shared by the live canvas (Keycap) and the standalone SVG export
 * so the two never drift.
 */
export function resolveHoldDisplay(
  hold: HoldBinding | undefined,
  layers: readonly Layer[],
): HoldDisplay | undefined {
  if (!hold) return undefined;
  if (isLayerHold(hold)) {
    if (!hold.layer) return undefined;
    const target = layers.find((layer) => layer.name === hold.layer);
    return { text: hold.layer, layerName: hold.layer, color: target?.color };
  }
  return hold.glyph ? { text: hold.glyph } : undefined;
}

const LEGEND_SLOTS = ["primary", "shifted", "altgr", "color"] as const;

/** Drop unset or empty-string slots so they never reach the persisted JSON. */
function pruneLegend(legend: KeyLegend): KeyLegend {
  const pruned: KeyLegend = {};
  for (const slot of LEGEND_SLOTS) {
    const value = legend[slot];
    if (value) pruned[slot] = value;
  }
  if (legend.hold && isLayerHold(legend.hold)) {
    if (legend.hold.layer) pruned.hold = { layer: legend.hold.layer };
  } else if (legend.hold?.glyph) {
    pruned.hold = legend.hold.shifted
      ? { glyph: legend.hold.glyph, shifted: legend.hold.shifted }
      : { glyph: legend.hold.glyph };
  }
  return pruned;
}

function pruneKeys(keys: Record<string, KeyLegend>): Record<string, KeyLegend> {
  const out: Record<string, KeyLegend> = {};
  for (const [id, legend] of Object.entries(keys)) {
    out[id] = pruneLegend(legend);
  }
  return out;
}

export function serialize(doc: KeymapDocument): string {
  const homing = doc.board?.homing ?? [];
  const normalized: KeymapDocument = {
    schemaVersion: SCHEMA_VERSION,
    ...(homing.length ? { board: { homing } } : {}),
    layers: doc.layers.map((layer) => ({
      name: layer.name,
      color: layer.color,
      keys: pruneKeys(layer.keys),
    })),
  };
  return JSON.stringify(normalized, null, 2);
}

function isLayer(value: unknown): value is Layer {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Layer).name === "string" &&
    typeof (value as Layer).color === "string" &&
    typeof (value as Layer).keys === "object" &&
    (value as Layer).keys !== null
  );
}

function isBoard(value: unknown): value is Board {
  if (typeof value !== "object" || value === null) return false;
  const homing = (value as Board).homing;
  return homing === undefined || (Array.isArray(homing) && homing.every((id) => typeof id === "string"));
}

export function parse(json: string): KeymapDocument {
  const raw = JSON.parse(json) as { schemaVersion?: unknown; board?: unknown; layers?: unknown };
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(raw.schemaVersion as number)) {
    throw new Error(
      `unsupported schemaVersion: ${String(raw.schemaVersion)} (expected one of ${SUPPORTED_SCHEMA_VERSIONS.join(", ")})`,
    );
  }
  if (!Array.isArray(raw.layers)) {
    throw new Error("invalid keymap document: `layers` must be an array");
  }
  raw.layers.forEach((layer, index) => {
    if (!isLayer(layer)) {
      throw new Error(`invalid keymap document: layer ${index} is malformed`);
    }
  });
  if (raw.board !== undefined && !isBoard(raw.board)) {
    throw new Error("invalid keymap document: `board` is malformed");
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    ...(raw.board !== undefined ? { board: raw.board as Board } : {}),
    layers: raw.layers as Layer[],
  };
}
