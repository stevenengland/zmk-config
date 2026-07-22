import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Layer } from "../model/schema";
import type { ViewMode } from "../state/documentReducer";
import { ActionMenu } from "./ActionMenu";
import { ConfirmDialog } from "./ConfirmDialog";

// Colors drawn from the "Engineering Chic" colorset (docs/design/stitch.md).
const TEAL = "#00e5ff"; // primary-container — active accent
const SURFACE = "#131313";
const ON_SURFACE = "#e5e2e1";
const ON_SURFACE_VARIANT = "#bac9cc";
const OUTLINE_VARIANT = "#3b494c";

interface LayerTabsProps {
  layers: Layer[];
  activeIndex: number;
  viewMode: ViewMode;
  onSelect: (index: number) => void;
  onSelectOverview: () => void;
  onAdd: () => void;
  onRename: (index: number, name: string) => void;
  onRecolor: (index: number, color: string) => void;
  onDelete: (index: number) => void;
}

const strip: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  borderBottom: `1px solid ${OUTLINE_VARIANT}`,
  background: SURFACE,
  padding: "0 4px",
  fontFamily: "Inter, system-ui, sans-serif",
};

function tabStyle(active: boolean): CSSProperties {
  return {
    appearance: "none",
    background: "transparent",
    border: "none",
    borderBottom: active ? `2px solid ${TEAL}` : "2px solid transparent",
    color: active ? ON_SURFACE : ON_SURFACE_VARIANT,
    fontWeight: active ? 600 : 400,
    padding: "10px 12px",
    cursor: "pointer",
  };
}

const controlButton: CSSProperties = {
  appearance: "none",
  background: "#1a1d22",
  border: `1px solid ${OUTLINE_VARIANT}`,
  borderRadius: 4,
  color: ON_SURFACE,
  height: 32,
  padding: "0 10px",
  cursor: "pointer",
};

const dialogBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 40,
  display: "grid",
  placeItems: "center",
  padding: 24,
  background: "rgba(0, 0, 0, 0.76)",
};

const dialogSurface: CSSProperties = {
  display: "grid",
  gap: 16,
  width: "min(420px, 100%)",
  boxSizing: "border-box",
  padding: 20,
  border: `1px solid ${OUTLINE_VARIANT}`,
  borderRadius: 8,
  background: SURFACE,
  color: ON_SURFACE,
};

/**
 * Horizontal layer tab strip above the canvas. Each tab selects its layer; the
 * active layer can be renamed, recolored, or deleted. Deletion is guarded by a
 * shared confirmation and disabled when only one layer remains.
 */
export function LayerTabs({
  layers,
  activeIndex,
  viewMode,
  onSelect,
  onSelectOverview,
  onAdd,
  onRename,
  onRecolor,
  onDelete,
}: LayerTabsProps) {
  const active = layers[activeIndex];
  const isLastLayer = layers.length <= 1;
  const [pendingDelete, setPendingDelete] = useState<{ index: number; name: string } | null>(null);
  const [editDraft, setEditDraft] = useState<{ index: number; name: string; color: string } | null>(null);
  const selectedTabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedTabRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [activeIndex, viewMode]);

  const requestDelete = () => {
    setPendingDelete({ index: activeIndex, name: active.name });
  };

  const requestEdit = () => {
    setEditDraft({ index: activeIndex, name: active.name, color: active.color });
  };

  return (
    <>
      <div className="km-layer-controls" role="toolbar" aria-label="Layer controls" style={strip}>
      <div className="km-layer-tabs" role="tablist" style={{ display: "flex", flex: 1, overflowX: "auto" }}>
        <button
          ref={viewMode === "overview" ? selectedTabRef : undefined}
          role="tab"
          type="button"
          className="km-tab"
          aria-selected={viewMode === "overview"}
          style={tabStyle(viewMode === "overview")}
          onClick={onSelectOverview}
        >
          Overview
        </button>
        {layers.map((layer, index) => (
          <button
            key={index}
            ref={viewMode === "edit" && index === activeIndex ? selectedTabRef : undefined}
            role="tab"
            type="button"
            className="km-tab"
            aria-selected={viewMode === "edit" && index === activeIndex}
            style={tabStyle(viewMode === "edit" && index === activeIndex)}
            onClick={() => onSelect(index)}
          >
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: layer.color,
                marginRight: 6,
              }}
            />
            {layer.name}
          </button>
        ))}
      </div>

      <button type="button" className="km-btn" style={controlButton} onClick={onAdd}>
        Add layer
      </button>
      <ActionMenu
        label="Layer actions"
        triggerStyle={controlButton}
        actions={[{ label: "Edit layer", onSelect: requestEdit }]}
      />
      <button type="button" className="km-btn" style={controlButton} onClick={requestDelete} disabled={isLastLayer}>
        Delete layer
      </button>
      </div>
      {editDraft && (
        <div style={dialogBackdrop}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-layer-title"
            style={dialogSurface}
            onSubmit={(event) => {
              event.preventDefault();
              onRename(editDraft.index, editDraft.name);
              onRecolor(editDraft.index, editDraft.color);
              setEditDraft(null);
            }}
          >
            <h2 id="edit-layer-title" style={{ margin: 0, fontSize: 20 }}>Edit layer</h2>
            <label>
              Layer name
              <input
                aria-label="Layer name"
                value={editDraft.name}
                onChange={(event) => setEditDraft({ ...editDraft, name: event.target.value })}
              />
            </label>
            <label>
              Layer color
              <input
                aria-label="Layer color"
                type="color"
                value={editDraft.color}
                onChange={(event) => setEditDraft({ ...editDraft, color: event.target.value })}
              />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" className="km-btn" onClick={() => setEditDraft(null)}>
                Cancel
              </button>
              <button type="submit" className="km-btn km-btn--primary">
                Save changes
              </button>
            </div>
          </form>
        </div>
      )}
      {pendingDelete && (
        <ConfirmDialog
          title={`Delete layer "${pendingDelete.name}"?`}
          message="All key assignments on this layer will be removed."
          confirmLabel="Delete layer"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDelete(pendingDelete.index);
            setPendingDelete(null);
          }}
        />
      )}
    </>
  );
}
