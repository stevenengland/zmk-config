import { useState, type CSSProperties } from "react";
import type { KeymapDocument } from "../model/schema";
import { openDocument, saveDocument, type SaveTarget } from "../io/persistence";
import type { StatusMessage } from "./StatusBar";

// Colors drawn from the "Engineering Chic" colorset (docs/design/stitch.md).
const SURFACE = "#131313";
const ON_SURFACE = "#e5e2e1";
const OUTLINE = "#849396";
const OUTLINE_VARIANT = "#3b494c";

interface ToolbarProps {
  document: KeymapDocument;
  onLoad: (document: KeymapDocument) => void;
  onStatus: (message: StatusMessage | null) => void;
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

const actionButton: CSSProperties = {
  appearance: "none",
  background: "transparent",
  border: `1px solid ${OUTLINE}`,
  borderRadius: 4,
  color: ON_SURFACE,
  height: 32,
  padding: "0 12px",
  cursor: "pointer",
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
export function Toolbar({ document, onLoad, onStatus }: ToolbarProps) {
  const [handle, setHandle] = useState<SaveTarget>(null);

  const handleOpen = async () => {
    try {
      const result = await openDocument();
      if (!result) return;
      setHandle(result.handle);
      onLoad(result.document);
      onStatus({ text: "Loaded keymap", tone: "info" });
    } catch (error) {
      if (isAbort(error)) return;
      onStatus({ text: `Could not open file: ${describe(error)}`, tone: "error" });
    }
  };

  const handleSave = async () => {
    try {
      setHandle(await saveDocument(document, handle));
      onStatus({ text: "Saved keymap", tone: "info" });
    } catch (error) {
      if (isAbort(error)) return;
      onStatus({ text: `Could not save file: ${describe(error)}`, tone: "error" });
    }
  };

  return (
    <div style={bar}>
      <button type="button" style={actionButton} onClick={handleOpen}>
        Open
      </button>
      <button type="button" style={actionButton} onClick={handleSave}>
        Save
      </button>
    </div>
  );
}
