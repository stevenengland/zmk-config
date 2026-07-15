import { useEffect, useRef, type CSSProperties } from "react";
import type { Layer } from "../model/schema";
import { boardGeometry } from "../model/geometry";
import { boardViewBox } from "../model/renderStyle";
import { KeyboardCanvas } from "./KeyboardCanvas";
import { ZoomPanViewport } from "./ZoomPanViewport";

const TEAL = "#00e5ff";
const SURFACE_CONTAINER = "#20201f";
const ON_SURFACE = "#e5e2e1";
const OUTLINE_VARIANT = "#3b494c";
const ON_TEAL = "#003641";
const BLOCK_PADDING = 16;
const BLOCK_BORDER = 1;
const BLOCK_BORDER_ACTIVE = 2;
const NATURAL_CONTENT_WIDTH = boardViewBox(boardGeometry).width + 2 * (BLOCK_PADDING + BLOCK_BORDER);

const stack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
  padding: 24,
  boxSizing: "border-box",
};

function blockStyle(active: boolean): CSSProperties {
  return {
    background: SURFACE_CONTAINER,
    border: `${active ? BLOCK_BORDER_ACTIVE : BLOCK_BORDER}px solid ${active ? TEAL : OUTLINE_VARIANT}`,
    boxShadow: active ? "0 4px 20px rgba(0, 229, 255, 0.18)" : undefined,
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
  homingKeys?: ReadonlySet<string>;
}

export function LayerOverview({
  layers,
  activeIndex,
  selectedKeyId = null,
  onPickKey,
  homingKeys,
}: LayerOverviewProps) {
  const activeBlockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeBlockRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  return (
    <ZoomPanViewport ariaLabel="All layers" role="list" fitWidth={NATURAL_CONTENT_WIDTH}>
      <div style={stack}>
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
                <span
                  aria-hidden
                  style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: layer.color }}
                />
                {layer.name}
                {active ? <span style={activeBadge}>Active</span> : null}
              </div>
              <KeyboardCanvas
                legends={layer.keys}
                selectedKeyId={active ? selectedKeyId : null}
                onSelectKey={(keyId) => onPickKey?.(index, keyId)}
                layerColor={layer.color}
                homingKeys={homingKeys}
              />
            </div>
          );
        })}
      </div>
    </ZoomPanViewport>
  );
}
