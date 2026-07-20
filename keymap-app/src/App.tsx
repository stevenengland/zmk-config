import { useEffect, useMemo, useReducer, useState } from "react";
import { KeyboardCanvas } from "./components/KeyboardCanvas";
import { KeyEditorPanel } from "./components/KeyEditorPanel";
import { LayerOverview } from "./components/LayerOverview";
import { LayerTabs } from "./components/LayerTabs";
import { ResponsiveAppShell } from "./components/ResponsiveAppShell";
import { ZoomPanViewport } from "./components/ZoomPanViewport";
import { FeedbackProvider } from "./components/FeedbackProvider";
import { useFeedback } from "./components/feedbackContext";
import type { StatusMessage } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
import { MacroLibraryDialog } from "./components/MacroLibraryDialog";
import { DocumentContext } from "./state/documentContext";
import { createInitialHistoryState, documentHistoryReducer } from "./state/documentReducer";
import { useFileSession } from "./state/useFileSession";
import { canRedo, canUndo } from "./model/history";
import { FONT_FACE_CSS } from "./model/renderStyle";

// Accent palette for freshly added layers (docs/design/stitch.md), cycled by
// layer count so consecutive layers stay visually distinct.
const LAYER_PALETTE = ["#00e5ff", "#d4bbff", "#fec931", "#ffb4ab"];

// Elements with native undo/redo of their own (text inputs) keep Ctrl+Z.
function isTextEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
}

function FeedbackStatusBridge({ message }: { message: StatusMessage | null }) {
  const feedback = useFeedback();

  useEffect(() => {
    if (!message) feedback.clear();
    else if (message.tone === "error") feedback.error(message.text);
    else feedback.success(message.text);
  }, [feedback, message]);

  return null;
}

export function App() {
  const [historyState, dispatch] = useReducer(documentHistoryReducer, undefined, createInitialHistoryState);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const [hasSelectedBoardPosition, setHasSelectedBoardPosition] = useState(false);
  const [macroLibraryOpen, setMacroLibraryOpen] = useState(false);
  const store = useMemo(() => ({ state: historyState, dispatch }), [historyState]);

  const state = historyState.present;
  const fileSession = useFileSession(state.document);
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
    setHasSelectedBoardPosition(true);
    dispatch({ type: "select-key", keyId: id });
    setMobileEditorOpen(true);
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
    <FeedbackProvider sheetOpen={mobileEditorOpen}>
      <DocumentContext.Provider value={store}>
        <main
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          width: "100%",
          maxWidth: 1420,
          margin: "0 auto",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* App-global so the embedded symbol font is available to the on-canvas
            legends regardless of whether the picker (which also declares it) is
            mounted — see model/renderStyle.ts. */}
        <style>{FONT_FACE_CSS}</style>
        <Toolbar
          document={state.document}
          activeLayer={activeLayer}
          filename={fileSession.filename}
          isDirty={fileSession.isDirty}
          onLoad={(document, filename) => {
            setStatus(null);
            dispatch({ type: "load", document });
            fileSession.markOpened(document, filename);
          }}
          onSaved={fileSession.markSaved}
          onStatus={setStatus}
          onUndo={() => dispatch({ type: "undo" })}
          onRedo={() => dispatch({ type: "redo" })}
          canUndo={canUndo(historyState)}
          canRedo={canRedo(historyState)}
          onManageMacros={() => setMacroLibraryOpen(true)}
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
        <ResponsiveAppShell
          editorOpen={mobileEditorOpen && selectedKeyId !== null}
          onCloseEditor={() => setMobileEditorOpen(false)}
          editor={(
            <KeyEditorPanel
              keyId={selectedKeyId}
              activeIndex={state.activeIndex}
              legend={selectedLegend}
              layerCount={state.document.layers.length}
              layerNames={state.document.layers.map((l) => l.name)}
              onSetSlot={(slot, glyph) => {
                if (!selectedKeyId) return;
                dispatch({ type: "set-slot", keyId: selectedKeyId, slot, value: glyph });
              }}
              onSetColor={(color) => {
                if (!selectedKeyId) return;
                dispatch({ type: "set-key-color", keyId: selectedKeyId, color });
              }}
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
              onAddTap={() => {
                if (!selectedKeyId) return;
                dispatch({ type: "add-tap", keyId: selectedKeyId });
              }}
              onUpdateTap={(index, tap) => {
                if (!selectedKeyId) return;
                dispatch({ type: "update-tap", keyId: selectedKeyId, index, tap });
              }}
              onDeleteTap={(index) => {
                if (!selectedKeyId) return;
                dispatch({ type: "delete-tap", keyId: selectedKeyId, index });
              }}
              macros={state.document.macros ?? {}}
              onAddMacro={(name, def) => dispatch({ type: "add-macro", name, def })}
              onUpdateMacro={(name, def) => dispatch({ type: "update-macro", name, def })}
              onDeleteMacro={(name) => dispatch({ type: "delete-macro", name })}
            />
          )}
        >
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
            <ZoomPanViewport ariaLabel="Edit layer viewport" fitWidth={1088}>
              <div style={{ width: 1088, padding: 24, boxSizing: "border-box" }}>
                <div
                  style={{
                    width: 1040,
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
                    guidanceVisible={!hasSelectedBoardPosition}
                  />
                </div>
              </div>
            </ZoomPanViewport>
          )}
        </ResponsiveAppShell>
        </main>
        {macroLibraryOpen && (
          <MacroLibraryDialog
            macros={state.document.macros ?? {}}
            onAdd={(name, def) => dispatch({ type: "add-macro", name, def })}
            onUpdate={(name, def) => dispatch({ type: "update-macro", name, def })}
            onDelete={(name) => dispatch({ type: "delete-macro", name })}
            onClose={() => setMacroLibraryOpen(false)}
          />
        )}
        <FeedbackStatusBridge message={status} />
      </DocumentContext.Provider>
    </FeedbackProvider>
  );
}
