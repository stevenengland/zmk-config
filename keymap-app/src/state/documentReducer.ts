import { SCHEMA_VERSION, type KeymapDocument, type Layer } from "../model/schema";

const DEFAULT_LAYER_NAME = "Base";
const DEFAULT_LAYER_COLOR = "#00e5ff";

export interface DocumentState {
  document: KeymapDocument;
  activeIndex: number;
}

export type DocumentAction =
  | { type: "add"; name: string; color: string }
  | { type: "rename"; index: number; name: string }
  | { type: "recolor"; index: number; color: string }
  | { type: "delete"; index: number }
  | { type: "select"; index: number };

export function createInitialState(): DocumentState {
  return {
    document: {
      schemaVersion: SCHEMA_VERSION,
      layers: [{ name: DEFAULT_LAYER_NAME, color: DEFAULT_LAYER_COLOR, keys: {} }],
    },
    activeIndex: 0,
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

export function documentReducer(state: DocumentState, action: DocumentAction): DocumentState {
  switch (action.type) {
    case "add": {
      const layers = [
        ...state.document.layers,
        { name: action.name, color: action.color, keys: {} },
      ];
      return { document: { ...state.document, layers }, activeIndex: layers.length - 1 };
    }
    case "rename":
      return replaceLayer(state, action.index, (layer) => ({ ...layer, name: action.name }));
    case "recolor":
      return replaceLayer(state, action.index, (layer) => ({ ...layer, color: action.color }));
    case "delete": {
      if (state.document.layers.length <= 1) return state;
      const layers = state.document.layers.filter((_, i) => i !== action.index);
      const activeIndex = Math.min(state.activeIndex, layers.length - 1);
      return { document: { ...state.document, layers }, activeIndex };
    }
    case "select":
      return { ...state, activeIndex: action.index };
  }
}
