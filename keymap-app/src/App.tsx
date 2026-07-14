import { useEffect, useMemo, useReducer, useState } from "react";
import { KeyboardCanvas } from "./components/KeyboardCanvas";
import { KeyEditorPanel } from "./components/KeyEditorPanel";
import { LayerOverview } from "./components/LayerOverview";
import { LayerTabs } from "./components/LayerTabs";
import { StatusBar, type StatusMessage } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
import { DocumentContext } from "./state/documentContext";
import { createInitialHistoryState, documentHistoryReducer } from "./state/documentReducer";
import { canRedo, canUndo } from "./model/history";
import { FONT_FACE_CSS } from "./model/renderStyle";

// Accent palette for freshly added layers (docs/design/stitch.md), cycled by
// layer count so consecutive layers stay visually distinct.
const LAYER_PALETTE = ["#00e5ff", "#d4bbff", "#fec931", "#ffb4ab"];

// Elements with native undo/redo of their own (text inputs) keep Ctrl+Z.
function isTextEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
}

export function App() {
  const [historyState, dispatch] = useReducer(documentHistoryReducer, undefined, createInitialHistoryState);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const store = useMemo(() => ({ state: historyState, dispatch }), [historyState]);

  const state = historyState.present;
  const activeLayer = state.document.layers[state.activeIndex];
  const selectedKeyId = state.selectedKeyId;
  const selectedLegend = selectedKeyId ? activeLayer.keys[selectedKeyId] ?? {} : {};
  const homingKeys = useMemo(
    () => new Set(state.document.board?.homing ?? []),
    [state.document.board],
  );

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.key.toLowerCase() !== "z" || isTextEditable(e.target)) return;
      e.preventDefault();
      dispatch(e.shiftKey ? { type: "redo" } : { type: "undo" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
        {/* App-global so the embedded symbol font is available to the on-canvas
            legends regardless of whether the picker (which also declares it) is
            mounted — see model/renderStyle.ts. */}
        <style>{FONT_FACE_CSS}</style>
        <Toolbar
          document={state.document}
          activeLayer={activeLayer}
          onLoad={(document) => {
            setStatus(null);
            dispatch({ type: "load", document });
          }}
          onStatus={setStatus}
          onUndo={() => dispatch({ type: "undo" })}
          onRedo={() => dispatch({ type: "redo" })}
          canUndo={canUndo(historyState)}
          canRedo={canRedo(historyState)}
        />
        <LayerTabs
          layers={state.document.layers}
          activeIndex={state.activeIndex}
          viewMode={state.viewMode}
          onSelect={(index) => {
            // A layer tab is a single-selection choice alongside "All" — picking
            // one always means "edit this layer," so it exits overview too.
            dispatch({ type: "select", index });
            dispatch({ type: "set-view", mode: "edit" });
          }}
          onSelectOverview={() => dispatch({ type: "set-view", mode: "overview" })}
          onAdd={addLayer}
          onRename={(index, name) => dispatch({ type: "rename", index, name })}
          onRecolor={(index, color) => dispatch({ type: "recolor", index, color })}
          onDelete={(index) => dispatch({ type: "delete", index })}
        />
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {state.viewMode === "overview" ? (
            <div style={{ flex: 1, minHeight: 0 }}>
              <LayerOverview
                layers={state.document.layers}
                activeIndex={state.activeIndex}
                selectedKeyId={selectedKeyId}
                homingKeys={homingKeys}
                onPickKey={(layerIndex, keyId) => {
                  dispatch({ type: "select", index: layerIndex });
                  selectKey(keyId);
                }}
              />
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                padding: 24,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
              }}
            >
              {/* Surface-container card framing the board (ZSA-Oryx pattern):
                  lifts the canvas off the page background and centers it. */}
              <div
                style={{
                  width: "100%",
                  maxWidth: 1040,
                  padding: 20,
                  background: "#1b1e23",
                  border: "1px solid #3b494c",
                  borderRadius: 12,
                  boxSizing: "border-box",
                }}
              >
                <KeyboardCanvas
                  legends={activeLayer.keys}
                  selectedKeyId={selectedKeyId}
                  onSelectKey={selectKey}
                  layerColor={activeLayer.color}
                  homingKeys={homingKeys}
                  layers={state.document.layers}
                  onJumpToLayer={(name) => {
                    const index = state.document.layers.findIndex((l) => l.name === name);
                    if (index >= 0) dispatch({ type: "select", index });
                  }}
                  macros={state.document.macros ?? {}}
                />
              </div>
            </div>
          )}
          <KeyEditorPanel
            keyId={selectedKeyId}
            activeIndex={state.activeIndex}
            legend={selectedLegend}
            layerCount={state.document.layers.length}
            layerNames={state.document.layers.map((l) => l.name)}
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
            homing={selectedKeyId ? homingKeys.has(selectedKeyId) : false}
            onToggleHoming={() => {
              if (!selectedKeyId) return;
              dispatch({ type: "toggle-homing", keyId: selectedKeyId });
            }}
            onSetHold={(hold) => {
              if (!selectedKeyId) return;
              dispatch({ type: "set-hold", keyId: selectedKeyId, hold });
            }}
            onSetMacro={(macro) => {
              if (!selectedKeyId) return;
              dispatch({ type: "set-macro", keyId: selectedKeyId, macro });
            }}
            macros={state.document.macros ?? {}}
            onAddMacro={(name, def) => dispatch({ type: "add-macro", name, def })}
            onUpdateMacro={(name, def) => dispatch({ type: "update-macro", name, def })}
            onDeleteMacro={(name) => dispatch({ type: "delete-macro", name })}
          />
        </div>
        <StatusBar message={status} />
      </main>
    </DocumentContext.Provider>
  );
}
