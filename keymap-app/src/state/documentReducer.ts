import {
  SCHEMA_VERSION,
  type KeyLegend,
  type KeymapDocument,
  type Layer,
} from "../model/schema";

const DEFAULT_LAYER_NAME = "Base";
const DEFAULT_LAYER_COLOR = "#00e5ff";

/** Editable legend text slots (excludes `color`, which has its own control). */
export type LegendSlot = "primary" | "shifted" | "altgr";

export interface DocumentState {
  document: KeymapDocument;
  activeIndex: number;
  selectedKeyId: string | null;
}

export type DocumentAction =
  | { type: "add"; name: string; color: string }
  | { type: "rename"; index: number; name: string }
  | { type: "recolor"; index: number; color: string }
  | { type: "delete"; index: number }
  | { type: "select"; index: number }
  | { type: "select-key"; keyId: string | null }
  | { type: "set-slot"; keyId: string; slot: LegendSlot; value: string }
  | { type: "set-key-color"; keyId: string; color: string };

export function createInitialState(): DocumentState {
  return {
    document: {
      schemaVersion: SCHEMA_VERSION,
      layers: [{ name: DEFAULT_LAYER_NAME, color: DEFAULT_LAYER_COLOR, keys: {} }],
    },
    activeIndex: 0,
    selectedKeyId: null,
  };
}

function replaceLayer(
  state: DocumentState,
  index: number,
  update: (layer: Layer) => Layer,
): DocumentState {
  const layers = state.document.layers.map((layer, i) =>
    i === index ? update(layer) : layer,
  );
  return { ...state, document: { ...state.document, layers } };
}

/**
 * Apply `update` to a key's legend on the active layer. When the resulting
 * legend has no remaining slots the key is dropped entirely, so a fully cleared
 * key never lingers in the document (and thus never serializes).
 */
function updateActiveKey(
  state: DocumentState,
  keyId: string,
  update: (legend: KeyLegend) => KeyLegend,
): DocumentState {
  return replaceLayer(state, state.activeIndex, (layer) => {
    const next = update(layer.keys[keyId] ?? {});
    const keys = { ...layer.keys };
    if (Object.keys(next).length === 0) {
      delete keys[keyId];
    } else {
      keys[keyId] = next;
    }
    return { ...layer, keys };
  });
}

function withSlot(legend: KeyLegend, slot: LegendSlot, value: string): KeyLegend {
  const next = { ...legend };
  if (value) next[slot] = value;
  else delete next[slot];
  return next;
}

export function documentReducer(state: DocumentState, action: DocumentAction): DocumentState {
  switch (action.type) {
    case "add": {
      const layers = [
        ...state.document.layers,
        { name: action.name, color: action.color, keys: {} },
      ];
      return { ...state, document: { ...state.document, layers }, activeIndex: layers.length - 1 };
    }
    case "rename":
      return replaceLayer(state, action.index, (layer) => ({ ...layer, name: action.name }));
    case "recolor":
      return replaceLayer(state, action.index, (layer) => ({ ...layer, color: action.color }));
    case "delete": {
      if (state.document.layers.length <= 1) return state;
      const layers = state.document.layers.filter((_, i) => i !== action.index);
      const activeIndex = Math.min(state.activeIndex, layers.length - 1);
      return { ...state, document: { ...state.document, layers }, activeIndex };
    }
    case "select":
      return { ...state, activeIndex: action.index };
    case "select-key":
      return { ...state, selectedKeyId: action.keyId };
    case "set-slot":
      return updateActiveKey(state, action.keyId, (legend) =>
        withSlot(legend, action.slot, action.value),
      );
    case "set-key-color":
      return updateActiveKey(state, action.keyId, (legend) => {
        const next = { ...legend };
        if (action.color) next.color = action.color;
        else delete next.color;
        return next;
      });
  }
}
