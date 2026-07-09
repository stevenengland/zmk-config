import type { CSSProperties } from "react";
import type { Layer } from "../model/schema";
import { KeyboardCanvas } from "./KeyboardCanvas";

// Colors drawn from the "Engineering Chic" colorset (docs/design/stitch.md).
const TEAL = "#00e5ff"; // primary-container — active-layer highlight
const SURFACE_CONTAINER = "#20201f";
const ON_SURFACE = "#e5e2e1";
const OUTLINE_VARIANT = "#3b494c";

const list: CSSProperties = {
  height: "100%",
  boxSizing: "border-box",
  overflowY: "auto",
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

function blockStyle(active: boolean): CSSProperties {
  return {
    background: SURFACE_CONTAINER,
    border: `1px solid ${active ? TEAL : OUTLINE_VARIANT}`,
    borderRadius: 8,
    padding: 16,
    boxSizing: "border-box",
  };
}

const header: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 12,
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 20,
  fontWeight: 600,
  color: ON_SURFACE,
};

const swatch: CSSProperties = {
  display: "inline-block",
  width: 10,
  height: 10,
  borderRadius: "50%",
};

interface LayerOverviewProps {
  layers: Layer[];
  activeIndex: number;
}

/**
 * Read/scan surface stacking every layer, top to bottom, each as its own
 * keyboard block. Vertically scrollable so the stack never clips against the
 * viewport; the active layer's block carries a highlight border.
 */
export function LayerOverview({ layers, activeIndex }: LayerOverviewProps) {
  return (
    <div role="list" aria-label="All layers" style={list}>
      {layers.map((layer, index) => (
        <div key={index} role="listitem" style={blockStyle(index === activeIndex)}>
          <div style={header}>
            <span aria-hidden style={{ ...swatch, background: layer.color }} />
            {layer.name}
          </div>
          <KeyboardCanvas legends={layer.keys} />
        </div>
      ))}
    </div>
  );
}
