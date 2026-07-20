import { useState, type CSSProperties } from "react";
import type { KeymapDocument, Layer } from "../model/schema";
import { openDocument, saveDocument, type SaveTarget } from "../io/persistence";
import { exportAllLayersSvg, exportJson, exportLayerSvg } from "../io/export";
import type { StatusMessage } from "./StatusBar";

// Colors drawn from the "Engineering Chic" colorset (docs/design/stitch.md).
const SURFACE = "#131313";
const ON_SURFACE = "#e5e2e1";
const ON_SURFACE_VARIANT = "#bac9cc";
const OUTLINE_VARIANT = "#3b494c";

interface ToolbarProps {
  document: KeymapDocument;
  activeLayer: Layer;
  filename: string;
  isDirty: boolean;
  onLoad: (document: KeymapDocument, filename: string) => void;
  onSaved: (document: KeymapDocument) => void;
  onStatus: (message: StatusMessage | null) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// 56px top bar for global actions per the layout spec (docs/design/stitch.md).
const bar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  height: 56,
  padding: "0 12px",
  borderBottom: `1px solid ${OUTLINE_VARIANT}`,
  background: SURFACE,
  fontFamily: "Inter, system-ui, sans-serif",
};

// Surface-container base so buttons read as controls, not flat text; hover /
// active / focus states come from the `.km-btn` class (src/index.css).
const actionButton: CSSProperties = {
  appearance: "none",
  background: "#1a1d22",
  border: `1px solid ${OUTLINE_VARIANT}`,
  borderRadius: 4,
  color: ON_SURFACE,
  height: 32,
  padding: "0 12px",
  cursor: "pointer",
};

const wordmark: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 6,
  marginRight: 8,
  paddingRight: 12,
  borderRight: `1px solid ${OUTLINE_VARIANT}`,
};

const cluster: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const divider: CSSProperties = {
  width: 1,
  height: 24,
  background: OUTLINE_VARIANT,
};

/** `AbortError` is the picker-dismissed signal — not something to surface. */
function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Global Open/Save actions. Persistence mode (baseline download vs. in-place
 * write-back) is chosen inside the io layer; the toolbar just holds the
 * write-back handle across saves and routes results to the status bar.
 */
export function Toolbar({
  document,
  activeLayer,
  filename,
  isDirty,
  onLoad,
  onSaved,
  onStatus,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ToolbarProps) {
  const [handle, setHandle] = useState<SaveTarget>(null);

  const handleOpen = async () => {
    try {
      const result = await openDocument();
      if (!result) return;
      setHandle(result.handle);
      onLoad(result.document, result.filename);
      onStatus({ text: "Loaded keymap", tone: "info" });
    } catch (error) {
      if (isAbort(error)) return;
      onStatus({ text: `Could not open file: ${describe(error)}`, tone: "error" });
    }
  };

  const handleSave = async () => {
    try {
      setHandle(await saveDocument(document, handle));
      onSaved(document);
      onStatus({ text: "Saved keymap", tone: "info" });
    } catch (error) {
      if (isAbort(error)) return;
      onStatus({ text: `Could not save file: ${describe(error)}`, tone: "error" });
    }
  };

  const handleExportLayer = () => {
    try {
      exportLayerSvg(activeLayer, document.board?.homing ?? [], document.layers, document.macros ?? {});
      onStatus({ text: `Exported ${activeLayer.name}.svg`, tone: "info" });
    } catch (error) {
      onStatus({ text: `Could not export layer: ${describe(error)}`, tone: "error" });
    }
  };

  const handleExportAll = () => {
    try {
      exportAllLayersSvg(document.layers, document.board?.homing ?? [], document.macros ?? {});
      onStatus({ text: `Exported ${document.layers.length} layer(s) as SVG`, tone: "info" });
    } catch (error) {
      onStatus({ text: `Could not export layers: ${describe(error)}`, tone: "error" });
    }
  };

  const handleExportJson = () => {
    try {
      exportJson(document);
      onStatus({ text: "Exported keymap.json", tone: "info" });
    } catch (error) {
      onStatus({ text: `Could not export JSON: ${describe(error)}`, tone: "error" });
    }
  };

  return (
    <div className="km-toolbar" role="toolbar" aria-label="Global controls" style={bar}>
      <div className="km-toolbar__wordmark" style={wordmark}>
        <span style={{ fontWeight: 700, fontSize: 15, color: ON_SURFACE }}>Sofle Choc</span>
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: ON_SURFACE_VARIANT,
          }}
        >
          Keymap
        </span>
      </div>

      <div aria-label="File status" style={{ color: ON_SURFACE_VARIANT, fontSize: 12 }}>
        <span>{filename}</span>
        {isDirty ? <span> · Unsaved changes</span> : null}
      </div>

      <div className="km-toolbar__cluster km-toolbar__cluster--primary" style={cluster}>
        <button type="button" className="km-btn km-btn--primary" style={actionButton} onClick={handleOpen}>
          Open
        </button>
        <button type="button" className="km-btn km-btn--primary" style={actionButton} onClick={handleSave}>
          Save
        </button>
      </div>

      <div className="km-toolbar__divider" aria-hidden style={divider} />

      <div className="km-toolbar__cluster" style={cluster}>
        <button type="button" className="km-btn" style={actionButton} onClick={handleExportLayer}>
          Export SVG
        </button>
        <button type="button" className="km-btn" style={actionButton} onClick={handleExportAll}>
          Export All SVG
        </button>
        <button type="button" className="km-btn" style={actionButton} onClick={handleExportJson}>
          Export JSON
        </button>
      </div>

      <div className="km-toolbar__divider" aria-hidden style={divider} />

      <div className="km-toolbar__cluster" style={cluster}>
        <button type="button" className="km-btn" style={actionButton} onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" className="km-btn" style={actionButton} onClick={onRedo} disabled={!canRedo}>
          Redo
        </button>
      </div>
    </div>
  );
}
