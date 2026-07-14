import {
  SCHEMA_VERSION,
  type KeyLegend,
  type KeymapDocument,
  type Layer,
} from "../model/schema";
import {
  apply,
  createHistory,
  redo as historyRedo,
  undo as historyUndo,
  type HistoryDirective,
  type HistoryState,
} from "../model/history";

const DEFAULT_LAYER_NAME = "Base";
const DEFAULT_LAYER_COLOR = "#00e5ff";

/** Editable legend text slots (excludes `color`, which has its own control). */
export type LegendSlot = "primary" | "shifted" | "altgr";

/** `overview` stacks every layer read/scan-style; kept outside `document` so it never reaches export. */
export type ViewMode = "edit" | "overview";

export interface DocumentState {
  document: KeymapDocument;
  activeIndex: number;
  selectedKeyId: string | null;
  viewMode: ViewMode;
}

export type DocumentAction =
  | { type: "load"; document: KeymapDocument }
  | { type: "add"; name: string; color: string }
  | { type: "rename"; index: number; name: string }
  | { type: "recolor"; index: number; color: string }
  | { type: "delete"; index: number }
  | { type: "select"; index: number }
  | { type: "select-key"; keyId: string | null }
  | { type: "set-slot"; keyId: string; slot: LegendSlot; value: string }
  | { type: "set-key-color"; keyId: string; color: string }
  | { type: "toggle-homing"; keyId: string }
  | { type: "set-view"; mode: ViewMode };

export function createInitialState(): DocumentState {
  return {
    document: {
      schemaVersion: SCHEMA_VERSION,
      layers: [{ name: DEFAULT_LAYER_NAME, color: DEFAULT_LAYER_COLOR, keys: {} }],
    },
    activeIndex: 0,
    selectedKeyId: null,
    viewMode: "edit",
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

/** A legend with no glyph slots renders nothing, even if `color` is set. */
function hasVisibleContent(legend: KeyLegend): boolean {
  return Boolean(legend.primary || legend.shifted || legend.altgr);
}

/**
 * Apply `update` to a key's legend on the active layer. When the resulting
 * legend has no visible glyph slots the key is dropped entirely — a
 * color-only legend would render nothing yet linger in the saved file, so it
 * is pruned exactly like a fully cleared key.
 */
function updateActiveKey(
  state: DocumentState,
  keyId: string,
  update: (legend: KeyLegend) => KeyLegend,
): DocumentState {
  return replaceLayer(state, state.activeIndex, (layer) => {
    const next = update(layer.keys[keyId] ?? {});
    const keys = { ...layer.keys };
    if (!hasVisibleContent(next)) {
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
    case "load":
      return { document: action.document, activeIndex: 0, selectedKeyId: null, viewMode: "edit" };
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
    case "toggle-homing": {
      const current = state.document.board?.homing ?? [];
      const homing = current.includes(action.keyId)
        ? current.filter((id) => id !== action.keyId)
        : [...current, action.keyId];
      const document: KeymapDocument = {
        schemaVersion: state.document.schemaVersion,
        layers: state.document.layers,
        ...(homing.length ? { board: { homing } } : {}),
      };
      return { ...state, document };
    }
    case "set-view":
      return { ...state, viewMode: action.mode };
  }
}

/** Document state with undo/redo snapshot stacks. */
export type DocumentHistoryState = HistoryState<DocumentState>;

export type DocumentHistoryAction = DocumentAction | { type: "undo" } | { type: "redo" };

/** Selection changes aren't undoable edits; `load` starts a fresh history. */
function directiveFor(action: DocumentAction): HistoryDirective {
  switch (action.type) {
    case "load":
      return "reset";
    case "select":
    case "select-key":
    case "set-view":
      return "transparent";
    default:
      return "track";
  }
}

export function createInitialHistoryState(): DocumentHistoryState {
  return createHistory(createInitialState());
}

export function documentHistoryReducer(
  state: DocumentHistoryState,
  action: DocumentHistoryAction,
): DocumentHistoryState {
  if (action.type === "undo") return historyUndo(state);
  if (action.type === "redo") return historyRedo(state);
  return apply(state, action, documentReducer, directiveFor(action));
}
