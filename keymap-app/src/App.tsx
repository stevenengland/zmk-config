import { useMemo, useReducer, useState } from "react";
import { KeyboardCanvas } from "./components/KeyboardCanvas";
import { KeyEditorPanel } from "./components/KeyEditorPanel";
import { LayerTabs } from "./components/LayerTabs";
import { StatusBar, type StatusMessage } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
import { DocumentContext } from "./state/documentContext";
import { createInitialState, documentReducer } from "./state/documentReducer";

// Accent palette for freshly added layers (docs/design/stitch.md), cycled by
// layer count so consecutive layers stay visually distinct.
const LAYER_PALETTE = ["#00e5ff", "#d4bbff", "#fec931", "#ffb4ab"];

export function App() {
  const [state, dispatch] = useReducer(documentReducer, undefined, createInitialState);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const store = useMemo(() => ({ state, dispatch }), [state]);

  const activeLayer = state.document.layers[state.activeIndex];
  const selectedKeyId = state.selectedKeyId;
  const selectedLegend = selectedKeyId ? activeLayer.keys[selectedKeyId] ?? {} : {};

  const addLayer = () => {
    const count = state.document.layers.length;
    dispatch({
      type: "add",
      name: `Layer ${count + 1}`,
      color: LAYER_PALETTE[count % LAYER_PALETTE.length],
    });
  };

  const selectKey = (id: string) => {
    setStatus(null);
    dispatch({ type: "select-key", keyId: id });
  };

  return (
    <DocumentContext.Provider value={store}>
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          maxWidth: 1420,
          margin: "0 auto",
        }}
      >
        <Toolbar
          document={state.document}
          onLoad={(document) => {
            setStatus(null);
            dispatch({ type: "load", document });
          }}
          onStatus={setStatus}
        />
        <LayerTabs
          layers={state.document.layers}
          activeIndex={state.activeIndex}
          onSelect={(index) => dispatch({ type: "select", index })}
          onAdd={addLayer}
          onRename={(index, name) => dispatch({ type: "rename", index, name })}
          onRecolor={(index, color) => dispatch({ type: "recolor", index, color })}
          onDelete={(index) => dispatch({ type: "delete", index })}
        />
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, padding: 16 }}>
            <KeyboardCanvas
              legends={activeLayer.keys}
              selectedKeyId={selectedKeyId}
              onSelectKey={selectKey}
            />
          </div>
          <KeyEditorPanel
            keyId={selectedKeyId}
            legend={selectedLegend}
            onSetSlot={(slot, glyph) => {
              if (!selectedKeyId) return;
              setStatus(null);
              dispatch({ type: "set-slot", keyId: selectedKeyId, slot, value: glyph });
            }}
            onSetColor={(color) => {
              if (!selectedKeyId) return;
              dispatch({ type: "set-key-color", keyId: selectedKeyId, color });
            }}
            onError={(text) => setStatus({ text, tone: "error" })}
          />
        </div>
        <StatusBar message={status} />
      </main>
    </DocumentContext.Provider>
  );
}
