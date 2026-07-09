import type { CSSProperties } from "react";
import type { Layer } from "../model/schema";
import type { ViewMode } from "../state/documentReducer";

// Colors drawn from the "Engineering Chic" colorset (docs/design/stitch.md).
const TEAL = "#00e5ff"; // primary-container — active accent
const SURFACE = "#131313";
const ON_SURFACE = "#e5e2e1";
const ON_SURFACE_VARIANT = "#bac9cc";
const OUTLINE = "#849396";
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

/**
 * Horizontal layer tab strip above the canvas. Each tab selects its layer; the
 * active layer can be renamed, recolored, or deleted. Deletion is guarded by a
 * blocking confirmation and disabled when only one layer remains.
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

  const requestDelete = () => {
    if (window.confirm(`Delete layer "${active.name}"?`)) onDelete(activeIndex);
  };

  return (
    <div style={strip}>
      <div role="tablist" style={{ display: "flex", flex: 1, overflowX: "auto" }}>
        <button
          role="tab"
          type="button"
          className="km-tab"
          aria-selected={viewMode === "overview"}
          style={tabStyle(viewMode === "overview")}
          onClick={onSelectOverview}
        >
          All
        </button>
        {layers.map((layer, index) => (
          <button
            key={index}
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

      <input
        aria-label="Layer name"
        value={active.name}
        onChange={(e) => onRename(activeIndex, e.target.value)}
        style={{
          background: "#0e0e0e",
          border: `1px solid ${OUTLINE}`,
          borderRadius: 4,
          color: ON_SURFACE,
          fontFamily: "JetBrains Mono, monospace",
          height: 32,
          padding: "0 8px",
          width: 120,
        }}
      />
      <input
        aria-label="Layer color"
        type="color"
        value={active.color}
        onChange={(e) => onRecolor(activeIndex, e.target.value)}
        style={{ width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer" }}
      />
      <button type="button" className="km-btn" style={controlButton} onClick={onAdd}>
        Add layer
      </button>
      <button type="button" className="km-btn" style={controlButton} onClick={requestDelete} disabled={isLastLayer}>
        Delete layer
      </button>
    </div>
  );
}
