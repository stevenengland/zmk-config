import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Layer } from "../model/schema";
import { boardGeometry } from "../model/geometry";
import { boardViewBox } from "../model/renderStyle";
import { KeyboardCanvas } from "./KeyboardCanvas";

// Colors drawn from the "Engineering Chic" colorset (docs/design/stitch.md).
const TEAL = "#00e5ff"; // primary-container — active-layer highlight
const SURFACE_CONTAINER = "#20201f";
const ON_SURFACE = "#e5e2e1";
const OUTLINE_VARIANT = "#3b494c";

const MIN_ZOOM = 25;
const MAX_ZOOM = 200;

// Reference width a stacked layer block renders at when unscaled — the board's
// intrinsic pixel size plus its block chrome (padding + border, see blockStyle).
const BLOCK_CHROME = 2 * (16 + 1);
const NATURAL_CONTENT_WIDTH = boardViewBox(boardGeometry).width + BLOCK_CHROME;

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

const list: CSSProperties = {
  height: "100%",
  boxSizing: "border-box",
  overflowY: "auto",
  overflowX: "auto",
  padding: 24,
};

function stack(zoom: number): CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 24,
    transform: `scale(${zoom / 100})`,
    transformOrigin: "top left",
  };
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);

  const fitToWidth = () => {
    const containerWidth = containerRef.current?.clientWidth ?? 0;
    if (!containerWidth) return;
    setZoom(clampZoom((containerWidth / NATURAL_CONTENT_WIDTH) * 100));
  };

  useEffect(() => {
    fitToWidth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} role="list" aria-label="All layers" style={list}>
      <div style={stack(zoom)}>
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
    </div>
  );
}
