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
const WHEEL_ZOOM_STEP = 0.5; // zoom percentage points per wheel deltaY unit

// Reference width a stacked layer block renders at when unscaled — the board's
// intrinsic pixel size plus its block chrome (padding + border, see blockStyle).
const BLOCK_CHROME = 2 * (16 + 1);
const NATURAL_CONTENT_WIDTH = boardViewBox(boardGeometry).width + BLOCK_CHROME;

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

const list: CSSProperties = {
  flex: 1,
  minHeight: 0,
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // React attaches its delegated wheel listener as passive, which silently
    // ignores preventDefault — a native, non-passive listener is required to
    // actually suppress the browser's page zoom.
    const onWheel = (e: globalThis.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom((z) => clampZoom(z - e.deltaY * WHEEL_ZOOM_STEP));
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <input
        type="range"
        aria-label="Zoom"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        value={zoom}
        onChange={(e) => setZoom(clampZoom(Number(e.target.value)))}
      />
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
    </div>
  );
}
