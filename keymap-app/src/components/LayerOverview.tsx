import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { Layer } from "../model/schema";
import { boardGeometry } from "../model/geometry";
import { boardViewBox } from "../model/renderStyle";
import { KeyboardCanvas } from "./KeyboardCanvas";
import { anchoredScroll } from "./layerOverviewZoom";

// Colors drawn from the "Engineering Chic" colorset (docs/design/stitch.md).
const TEAL = "#00e5ff"; // primary-container — active-layer highlight
const SURFACE_CONTAINER = "#20201f";
const ON_SURFACE = "#e5e2e1";
const OUTLINE_VARIANT = "#3b494c";
const ON_TEAL = "#003641"; // on-primary-container — badge text on teal

const MIN_ZOOM = 25;
const MAX_ZOOM = 200;
const WHEEL_ZOOM_STEP = 0.5; // zoom percentage points per wheel deltaY unit

// Block box metrics shared by blockStyle and the fit-to-width baseline, so a
// change to either propagates to both instead of silently drifting the opening
// zoom out of sync (blockStyle is the single source of truth for the values).
const BLOCK_PADDING = 16;
const BLOCK_BORDER = 1; // inactive block border width
const BLOCK_BORDER_ACTIVE = 2; // heavier cue on the active block

// Reference width a stacked layer block renders at when unscaled — the board's
// intrinsic pixel size plus its block chrome (both sides' padding + border).
const BLOCK_CHROME = 2 * (BLOCK_PADDING + BLOCK_BORDER);
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

const controls: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "4px 8px",
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 12,
  color: ON_SURFACE,
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
    // Active block carries a heavier teal border plus an inset teal ring so the
    // "which layer do my edits land on" cue survives a scan down a tall stack —
    // a 1px tint swap alone was too quiet against the dark surface.
    border: `${active ? BLOCK_BORDER_ACTIVE : BLOCK_BORDER}px solid ${active ? TEAL : OUTLINE_VARIANT}`,
    boxShadow: active ? `inset 0 0 0 2px ${TEAL}` : undefined,
    borderRadius: 8,
    padding: BLOCK_PADDING,
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

const activeBadge: CSSProperties = {
  marginLeft: "auto",
  padding: "2px 8px",
  borderRadius: 999,
  background: TEAL,
  color: ON_TEAL,
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

interface LayerOverviewProps {
  layers: Layer[];
  activeIndex: number;
  selectedKeyId?: string | null;
  onPickKey?: (layerIndex: number, keyId: string) => void;
}

/**
 * Read/scan surface stacking every layer, top to bottom, each as its own
 * keyboard block. Vertically scrollable so the stack never clips against the
 * viewport; the active layer's block carries a highlight border and is scrolled
 * into view whenever it changes.
 */
export function LayerOverview({
  layers,
  activeIndex,
  selectedKeyId = null,
  onPickKey,
}: LayerOverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeBlockRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  // Mirrors zoom for the native wheel handler, whose closure is installed once.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  // Cursor-anchored scroll target applied after the scaled content has laid out.
  const pendingScroll = useRef<{ left: number; top: number } | null>(null);

  const fitToWidth = () => {
    const containerWidth = containerRef.current?.clientWidth ?? 0;
    if (!containerWidth) return;
    setZoom(clampZoom((containerWidth / NATURAL_CONTENT_WIDTH) * 100));
  };

  useEffect(() => {
    fitToWidth();
    window.addEventListener("resize", fitToWidth);
    return () => window.removeEventListener("resize", fitToWidth);
  }, []);

  // Bring the active layer's block into view on open and whenever the active
  // layer changes (e.g. after a cross-layer pick), so the highlight is never
  // stranded below the fold at the moment the user needs the orientation.
  useEffect(() => {
    activeBlockRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  // Apply the cursor-anchored scroll once the new zoom has been committed to the
  // DOM, so the target offset lands against the already-scaled content.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !pendingScroll.current) return;
    container.scrollLeft = pendingScroll.current.left;
    container.scrollTop = pendingScroll.current.top;
    pendingScroll.current = null;
  }, [zoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // React attaches its delegated wheel listener as passive, which silently
    // ignores preventDefault — a native, non-passive listener is required to
    // actually suppress the browser's page zoom.
    const onWheel = (e: globalThis.WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const prev = zoomRef.current;
      const next = clampZoom(prev - e.deltaY * WHEEL_ZOOM_STEP);
      if (next === prev) return;
      const rect = container.getBoundingClientRect();
      pendingScroll.current = {
        left: anchoredScroll(prev / 100, next / 100, container.scrollLeft, e.clientX - rect.left),
        top: anchoredScroll(prev / 100, next / 100, container.scrollTop, e.clientY - rect.top),
      };
      setZoom(next);
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  const zoomPct = Math.round(zoom);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={controls}>
        <input
          type="range"
          aria-label="Zoom"
          aria-valuetext={`${zoomPct}%`}
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          value={zoom}
          onChange={(e) => setZoom(clampZoom(Number(e.target.value)))}
        />
        <span aria-hidden>{zoomPct}%</span>
      </div>
      <div ref={containerRef} role="list" aria-label="All layers" style={list}>
        <div style={stack(zoom)}>
          {layers.map((layer, index) => {
            const active = index === activeIndex;
            return (
              <div
                key={index}
                ref={active ? activeBlockRef : undefined}
                role="listitem"
                style={blockStyle(active)}
              >
                <div style={header}>
                  <span aria-hidden style={{ ...swatch, background: layer.color }} />
                  {layer.name}
                  {active ? <span style={activeBadge}>Active</span> : null}
                </div>
                <KeyboardCanvas
                  legends={layer.keys}
                  selectedKeyId={active ? selectedKeyId : null}
                  onSelectKey={(keyId) => onPickKey?.(index, keyId)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
