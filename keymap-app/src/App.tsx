import { useMemo, useReducer } from "react";
import { KeyboardCanvas } from "./components/KeyboardCanvas";
import { LayerTabs } from "./components/LayerTabs";
import { DocumentContext } from "./state/documentContext";
import { createInitialState, documentReducer } from "./state/documentReducer";

// Accent palette for freshly added layers (docs/design/stitch.md), cycled by
// layer count so consecutive layers stay visually distinct.
const LAYER_PALETTE = ["#00e5ff", "#d4bbff", "#fec931", "#ffb4ab"];

export function App() {
  const [state, dispatch] = useReducer(documentReducer, undefined, createInitialState);
  const store = useMemo(() => ({ state, dispatch }), [state]);

  const addLayer = () => {
    const count = state.document.layers.length;
    dispatch({
      type: "add",
      name: `Layer ${count + 1}`,
      color: LAYER_PALETTE[count % LAYER_PALETTE.length],
    });
  };

  return (
    <DocumentContext.Provider value={store}>
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
        <LayerTabs
          layers={state.document.layers}
          activeIndex={state.activeIndex}
          onSelect={(index) => dispatch({ type: "select", index })}
          onAdd={addLayer}
          onRename={(index, name) => dispatch({ type: "rename", index, name })}
          onRecolor={(index, color) => dispatch({ type: "recolor", index, color })}
          onDelete={(index) => dispatch({ type: "delete", index })}
        />
        <KeyboardCanvas />
      </main>
    </DocumentContext.Provider>
  );
}
