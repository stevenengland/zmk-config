// Persisted keymap document model (PRD decision: top-level
// `{ schemaVersion: 1, layers }`). Unset legend slots are never persisted as
// empty strings — they are omitted from the JSON entirely.

export const SCHEMA_VERSION = 1;

/**
 * Legends for a single key. `primary` renders larger (bottom-left) and may
 * carry its own `color`; `shifted` (top-left) and `altgr` (bottom-right) are
 * plain glyphs. Every slot is optional and omitted when unset.
 */
export interface KeyLegend {
  primary?: string;
  shifted?: string;
  altgr?: string;
  color?: string;
}

export interface Layer {
  name: string;
  color: string;
  keys: Record<string, KeyLegend>;
}

export interface KeymapDocument {
  schemaVersion: typeof SCHEMA_VERSION;
  layers: Layer[];
}

const LEGEND_SLOTS = ["primary", "shifted", "altgr", "color"] as const;

/** Drop unset or empty-string slots so they never reach the persisted JSON. */
function pruneLegend(legend: KeyLegend): KeyLegend {
  const pruned: KeyLegend = {};
  for (const slot of LEGEND_SLOTS) {
    const value = legend[slot];
    if (value) pruned[slot] = value;
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
  const normalized: KeymapDocument = {
    schemaVersion: SCHEMA_VERSION,
    layers: doc.layers.map((layer) => ({
      name: layer.name,
      color: layer.color,
      keys: pruneKeys(layer.keys),
    })),
  };
  return JSON.stringify(normalized, null, 2);
}

export function parse(json: string): KeymapDocument {
  const raw = JSON.parse(json) as { schemaVersion?: unknown };
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `unsupported schemaVersion: ${String(raw.schemaVersion)} (expected ${SCHEMA_VERSION})`,
    );
  }
  return raw as KeymapDocument;
}
