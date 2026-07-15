// Persisted keymap document model (PRD decision: top-level
// `{ schemaVersion: 2, board, layers }`). Unset legend slots are never
// persisted as empty strings — they are omitted from the JSON entirely.
// `parse` accepts schemaVersion 1 and 2 and upgrades v1 in memory;
// `serialize` always emits the current version.

import marks from "../data/marks.json";

export const SCHEMA_VERSION = 2;

const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1, SCHEMA_VERSION];

/**
 * Legends for a single key. `primary` renders larger (bottom-left) and may
 * carry its own `color`; `shifted` (top-left) and `altgr` (bottom-right) are
 * plain glyphs. Every slot is optional and omitted when unset.
 */
/** `toggle` marks a hold as latching — "stays on until pressed again" (shift-lock, caps word). */
interface LatchableHold {
  toggle?: boolean;
}

/** Hold-tap in glyph mode: tap `primary`, hold `glyph`, Shift+hold `shifted` (tooltip-only). */
export interface GlyphHoldBinding extends LatchableHold {
  glyph: string;
  shifted?: string;
}

/** Layer-tap: hold moves to the named layer; glyph and tint are derived from it, always in sync. */
export interface LayerHoldBinding extends LatchableHold {
  layer: string;
}

export type HoldBinding = GlyphHoldBinding | LayerHoldBinding;

export function isLayerHold(hold: HoldBinding): hold is LayerHoldBinding {
  return "layer" in hold;
}

/** One tap-dance row: tapping `count` times fires `glyph`; `toggle` marks it "stays on until pressed again". */
export interface TapBinding {
  count: number;
  glyph: string;
  toggle?: boolean;
}

export interface KeyLegend {
  primary?: string;
  shifted?: string;
  altgr?: string;
  color?: string;
  hold?: HoldBinding;
  /** References a `macros` registry entry by name; independent of `hold` — a key can tap a macro and hold a layer at once. */
  macro?: string;
  taps?: TapBinding[];
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

/** One document-level macro: display glyph, tooltip label, and its step summary. */
export interface MacroDef {
  glyph: string;
  label: string;
  steps: string;
}

/** Document-level macro registry, keyed by name — keys reference an entry via `KeyLegend.macro`. */
export type MacroRegistry = Record<string, MacroDef>;

export interface KeymapDocument {
  schemaVersion: typeof SCHEMA_VERSION;
  board?: Board;
  macros?: MacroRegistry;
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
 * untinted. A latching hold takes the hollow-ring suffix, the same mark a
 * toggled tap-dance row carries. `layerName` stays the bare layer name, so
 * the ring never leaks into the jump target. Shared by the live canvas
 * (Keycap) and the standalone SVG export so the two never drift.
 */
export function resolveHoldDisplay(
  hold: HoldBinding | undefined,
  layers: readonly Layer[],
): HoldDisplay | undefined {
  if (!hold) return undefined;
  const mark = hold.toggle ? TAP_TOGGLE_RING : "";
  if (isLayerHold(hold)) {
    if (!hold.layer) return undefined;
    const target = layers.find((layer) => layer.name === hold.layer);
    return { text: hold.layer + mark, layerName: hold.layer, color: target?.color };
  }
  return hold.glyph ? { text: hold.glyph + mark } : undefined;
}

function hasVisibleHold(hold: HoldBinding | undefined): boolean {
  if (!hold) return false;
  return isLayerHold(hold) ? Boolean(hold.layer) : Boolean(hold.glyph);
}

/** A legend with no glyph slots renders nothing, even if `color` is set. Shared by the reducer and `parse`. */
export function hasVisibleContent(legend: KeyLegend): boolean {
  return Boolean(
    legend.primary || legend.shifted || legend.altgr || hasVisibleHold(legend.hold) || legend.macro || legend.taps?.length,
  );
}

/**
 * Resolves a key's macro reference against the document's registry — the
 * chip glyph the live canvas and the standalone SVG export both render.
 */
export function resolveMacroDisplay(
  macro: string | undefined,
  macros: MacroRegistry | undefined,
): MacroDef | undefined {
  if (!macro) return undefined;
  return macros?.[macro];
}

/** What one tap-dance row renders: the mark-glyph vocabulary from docs/design/behavior-legends.html. */
export interface TapDisplay {
  text: string;
}

// The mark vocabulary lives in src/data/marks.json because the font subset
// script reads the same file: every mark that can appear in a legend is
// embedded in the woff2, so exports render it anywhere (fontCoverage.test.ts).
const TAP_COUNT_DOT = marks.tapCount;
const TAP_TOGGLE_RING = marks.toggle;

/**
 * Resolves a key's tap-dance rows to what the behavior stack renders: each
 * row's count as a middot prefix (solid, left of the glyph — the trigger)
 * and, when toggled, a trailing hollow ring (the action), ascending by
 * count. Shared by the live canvas (Keycap) and the standalone SVG export
 * so the two never drift.
 */
export function resolveTapDisplays(taps: readonly TapBinding[] | undefined): TapDisplay[] {
  if (!taps) return [];
  return [...taps]
    .sort((a, b) => a.count - b.count)
    .map((tap) => ({
      text: TAP_COUNT_DOT.repeat(tap.count) + tap.glyph + (tap.toggle ? TAP_TOGGLE_RING : ""),
    }));
}

/** What the hollow ring means, spelled out wherever a latch appears in prose. */
export const LATCH_NOTE = "stays on until pressed again";

/** One row of the key detail tooltip's state matrix — a label and its value, plus an optional latch note. */
export interface TooltipRow {
  label: string;
  value: string;
  note?: string;
}

/**
 * Resolves a key's full state matrix for the hover tooltip / editor detail
 * view: one row per set slot (tap, Shift+tap, AltGr, hold, Shift+hold, one
 * per tap-dance count), in that order. A bound macro takes over the tap row
 * with its label and steps; a toggle-flagged tap row carries a latch note.
 */
export function resolveTooltipRows(
  legend: KeyLegend,
  macros: MacroRegistry,
  layers: readonly Layer[],
): TooltipRow[] {
  const rows: TooltipRow[] = [];
  const macroDef = resolveMacroDisplay(legend.macro, macros);
  if (macroDef) {
    rows.push({ label: "tap", value: `${macroDef.label} — ${macroDef.steps}` });
  } else if (legend.primary) {
    rows.push({ label: "tap", value: legend.primary });
  }
  if (legend.shifted) rows.push({ label: "⇧ + tap", value: legend.shifted });
  if (legend.altgr) rows.push({ label: "AltGr", value: legend.altgr });

  const holdDisplay = resolveHoldDisplay(legend.hold, layers);
  if (holdDisplay) {
    const holdName = legend.hold && isLayerHold(legend.hold) ? legend.hold.layer : legend.hold?.glyph;
    rows.push({
      label: "hold",
      value: holdName ?? holdDisplay.text,
      ...(legend.hold?.toggle ? { note: LATCH_NOTE } : {}),
    });
    if (legend.hold && !isLayerHold(legend.hold) && legend.hold.shifted) {
      rows.push({ label: "⇧ + hold", value: legend.hold.shifted });
    }
  }

  const sortedTaps = legend.taps ? [...legend.taps].sort((a, b) => a.count - b.count) : [];
  for (const tap of sortedTaps) {
    rows.push({
      label: `${tap.count}× tap`,
      value: tap.glyph,
      ...(tap.toggle ? { note: LATCH_NOTE } : {}),
    });
  }

  return rows;
}

const LEGEND_SLOTS = ["primary", "shifted", "altgr", "color"] as const;

/** Drop unset or empty-string slots so they never reach the persisted JSON. */
function pruneLegend(legend: KeyLegend): KeyLegend {
  const pruned: KeyLegend = {};
  for (const slot of LEGEND_SLOTS) {
    const value = legend[slot];
    if (value) pruned[slot] = value;
  }
  const latch = legend.hold?.toggle ? { toggle: true as const } : {};
  if (legend.hold && isLayerHold(legend.hold)) {
    if (legend.hold.layer) pruned.hold = { layer: legend.hold.layer, ...latch };
  } else if (legend.hold?.glyph) {
    pruned.hold = {
      glyph: legend.hold.glyph,
      ...(legend.hold.shifted ? { shifted: legend.hold.shifted } : {}),
      ...latch,
    };
  }
  if (legend.macro) pruned.macro = legend.macro;
  if (legend.taps?.length) {
    pruned.taps = legend.taps.map((tap) =>
      tap.toggle ? { count: tap.count, glyph: tap.glyph, toggle: true } : { count: tap.count, glyph: tap.glyph },
    );
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
  const macros = doc.macros ?? {};
  const normalized: KeymapDocument = {
    schemaVersion: SCHEMA_VERSION,
    ...(homing.length ? { board: { homing } } : {}),
    ...(Object.keys(macros).length ? { macros } : {}),
    layers: doc.layers.map((layer) => ({
      name: layer.name,
      color: layer.color,
      keys: pruneKeys(layer.keys),
    })),
  };
  return JSON.stringify(normalized, null, 2);
}

function isHoldBinding(value: unknown): value is HoldBinding {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.toggle !== undefined && typeof v.toggle !== "boolean") return false;
  if (typeof v.layer === "string") return true;
  return typeof v.glyph === "string" && (v.shifted === undefined || typeof v.shifted === "string");
}

function isTapBinding(value: unknown): value is TapBinding {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.count === "number" &&
    Number.isInteger(v.count) &&
    v.count >= 2 &&
    typeof v.glyph === "string" &&
    (v.toggle === undefined || typeof v.toggle === "boolean")
  );
}

/**
 * Validates a persisted key legend — the per-key `hold`, `taps`, and `macro`
 * structures the parser otherwise let through untouched, so malformed input
 * surfaced as a render-time crash instead of the "malformed" error every
 * other document-level structure raises on load.
 */
function isKeyLegend(value: unknown): value is KeyLegend {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  for (const slot of ["primary", "shifted", "altgr", "color", "macro"] as const) {
    if (v[slot] !== undefined && typeof v[slot] !== "string") return false;
  }
  if (v.hold !== undefined && !isHoldBinding(v.hold)) return false;
  if (v.taps !== undefined && (!Array.isArray(v.taps) || !v.taps.every(isTapBinding))) return false;
  return true;
}

function isLayer(value: unknown): value is Layer {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Layer).name === "string" &&
    typeof (value as Layer).color === "string" &&
    typeof (value as Layer).keys === "object" &&
    (value as Layer).keys !== null &&
    Object.values((value as Layer).keys).every(isKeyLegend)
  );
}

function isBoard(value: unknown): value is Board {
  if (typeof value !== "object" || value === null) return false;
  const homing = (value as Board).homing;
  return homing === undefined || (Array.isArray(homing) && homing.every((id) => typeof id === "string"));
}

function isMacroDef(value: unknown): value is MacroDef {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as MacroDef).glyph === "string" &&
    typeof (value as MacroDef).label === "string" &&
    typeof (value as MacroDef).steps === "string"
  );
}

function isMacroRegistry(value: unknown): value is MacroRegistry {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value as Record<string, unknown>).every(isMacroDef)
  );
}

/**
 * Drops `hold.layer` and `macro` references that name a layer or registry
 * entry absent from this document, and any key left with no other visible
 * content once cleaned — the same cleanup the reducer already applies on
 * rename/delete, extended to cover files loaded from disk (hand-edited or
 * exported by an older version) rather than only in-app edits.
 */
function cleanDanglingReferences(layers: readonly Layer[], macros: MacroRegistry | undefined): Layer[] {
  const layerNames = new Set(layers.map((layer) => layer.name));
  const macroNames = new Set(Object.keys(macros ?? {}));
  return layers.map((layer) => {
    const keys: Record<string, KeyLegend> = {};
    for (const [id, legend] of Object.entries(layer.keys)) {
      const next = { ...legend };
      if (next.hold && isLayerHold(next.hold) && !layerNames.has(next.hold.layer)) delete next.hold;
      if (next.macro && !macroNames.has(next.macro)) delete next.macro;
      if (hasVisibleContent(next)) keys[id] = next;
    }
    return { ...layer, keys };
  });
}

export function parse(json: string): KeymapDocument {
  const raw = JSON.parse(json) as {
    schemaVersion?: unknown;
    board?: unknown;
    macros?: unknown;
    layers?: unknown;
  };
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
  if (raw.macros !== undefined && !isMacroRegistry(raw.macros)) {
    throw new Error("invalid keymap document: `macros` is malformed");
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    ...(raw.board !== undefined ? { board: raw.board as Board } : {}),
    ...(raw.macros !== undefined ? { macros: raw.macros as MacroRegistry } : {}),
    layers: cleanDanglingReferences(raw.layers as Layer[], raw.macros as MacroRegistry | undefined),
  };
}
