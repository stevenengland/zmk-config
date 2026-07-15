import {
  hasVisibleContent,
  isLayerHold,
  SCHEMA_VERSION,
  type HoldBinding,
  type KeyLegend,
  type KeymapDocument,
  type Layer,
  type MacroDef,
  type MacroRegistry,
  type TapBinding,
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
  | { type: "set-hold"; keyId: string; hold: HoldBinding | undefined }
  | { type: "set-macro"; keyId: string; macro: string | undefined }
  | { type: "add-tap"; keyId: string }
  | { type: "update-tap"; keyId: string; index: number; tap: TapBinding }
  | { type: "delete-tap"; keyId: string; index: number }
  | { type: "add-macro"; name: string; def: MacroDef }
  | { type: "update-macro"; name: string; def: MacroDef }
  | { type: "delete-macro"; name: string }
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

/** A layer can be renamed independent of any key that targets it by name — keep every `hold.layer` reference in sync. */
function rewriteLayerHoldReferences(layers: readonly Layer[], oldName: string, newName: string): Layer[] {
  return layers.map((layer) => {
    const keys: Record<string, KeyLegend> = {};
    for (const [id, legend] of Object.entries(layer.keys)) {
      keys[id] =
        legend.hold && isLayerHold(legend.hold) && legend.hold.layer === oldName
          ? { ...legend, hold: { layer: newName } }
          : legend;
    }
    return { ...layer, keys };
  });
}

/** A deleted layer can still be targeted by other layers' hold bindings — clear those, dropping keys left with no other content. */
function clearLayerHoldReferences(layers: readonly Layer[], deletedName: string): Layer[] {
  return layers.map((layer) => {
    const keys: Record<string, KeyLegend> = {};
    for (const [id, legend] of Object.entries(layer.keys)) {
      if (!legend.hold || !isLayerHold(legend.hold) || legend.hold.layer !== deletedName) {
        keys[id] = legend;
        continue;
      }
      const next = { ...legend };
      delete next.hold;
      if (hasVisibleContent(next)) keys[id] = next;
    }
    return { ...layer, keys };
  });
}

/** A deleted macro can still be referenced by keys on any layer — clear those, dropping keys left with no other content. */
function clearMacroReferences(layers: readonly Layer[], deletedName: string): Layer[] {
  return layers.map((layer) => {
    const keys: Record<string, KeyLegend> = {};
    for (const [id, legend] of Object.entries(layer.keys)) {
      if (legend.macro !== deletedName) {
        keys[id] = legend;
        continue;
      }
      const next = { ...legend };
      delete next.macro;
      if (hasVisibleContent(next)) keys[id] = next;
    }
    return { ...layer, keys };
  });
}

/** Registry entries never persist as an empty object — mirrors `board`'s omit-when-empty rule. */
function withMacros(document: KeymapDocument, macros: MacroRegistry): KeymapDocument {
  if (Object.keys(macros).length) return { ...document, macros };
  const next = { ...document };
  delete next.macros;
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
    case "rename": {
      const oldName = state.document.layers[action.index].name;
      const renamed = replaceLayer(state, action.index, (layer) => ({ ...layer, name: action.name }));
      const layers = rewriteLayerHoldReferences(renamed.document.layers, oldName, action.name);
      return { ...renamed, document: { ...renamed.document, layers } };
    }
    case "recolor":
      return replaceLayer(state, action.index, (layer) => ({ ...layer, color: action.color }));
    case "delete": {
      if (state.document.layers.length <= 1) return state;
      const deletedName = state.document.layers[action.index].name;
      const layers = clearLayerHoldReferences(
        state.document.layers.filter((_, i) => i !== action.index),
        deletedName,
      );
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
    case "set-hold":
      // `hold` and `macro` are independent per-key fields: a key can tap a
      // macro and hold a layer at once, so neither clears the other.
      return updateActiveKey(state, action.keyId, (legend) => {
        const next = { ...legend };
        if (action.hold) next.hold = action.hold;
        else delete next.hold;
        return next;
      });
    case "set-macro":
      return updateActiveKey(state, action.keyId, (legend) => {
        const next = { ...legend };
        if (action.macro) next.macro = action.macro;
        else delete next.macro;
        return next;
      });
    case "add-tap":
      return updateActiveKey(state, action.keyId, (legend) => ({
        ...legend,
        taps: [...(legend.taps ?? []), { count: 2, glyph: "" }],
      }));
    case "update-tap":
      return updateActiveKey(state, action.keyId, (legend) => ({
        ...legend,
        taps: (legend.taps ?? []).map((tap, i) => (i === action.index ? action.tap : tap)),
      }));
    case "delete-tap":
      return updateActiveKey(state, action.keyId, (legend) => {
        const taps = (legend.taps ?? []).filter((_, i) => i !== action.index);
        const next = { ...legend };
        if (taps.length) next.taps = taps;
        else delete next.taps;
        return next;
      });
    case "add-macro":
    case "update-macro": {
      const macros = { ...(state.document.macros ?? {}), [action.name]: action.def };
      return { ...state, document: withMacros(state.document, macros) };
    }
    case "delete-macro": {
      if (!state.document.macros?.[action.name]) return state;
      const macros = { ...state.document.macros };
      delete macros[action.name];
      const layers = clearMacroReferences(state.document.layers, action.name);
      return { ...state, document: withMacros({ ...state.document, layers }, macros) };
    }
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
