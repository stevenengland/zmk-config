import { useRef, useState, type KeyboardEvent } from "react";
import { boardGeometry, keys, encoders } from "../model/geometry";
import type { KeyLegend, Layer, MacroRegistry } from "../model/schema";
import { BACKGROUND, boardViewBox } from "../model/renderStyle";
import { Keycap } from "./Keycap";
import { KeyTooltip } from "./KeyTooltip";

function viewBox(): string {
  const box = boardViewBox(boardGeometry);
  return `${box.x} ${box.y} ${box.width} ${box.height}`;
}

interface KeyboardCanvasProps {
  /** Committed legends for the active layer, keyed by element id. */
  legends?: Record<string, KeyLegend>;
  selectedKeyId?: string | null;
  onSelectKey?: (id: string) => void;
  /** This board's layer color, painted as a per-key corner tick. */
  layerColor?: string;
  /** Board-wide homing key ids — same set rendered on every layer. */
  homingKeys?: ReadonlySet<string>;
  /** Every layer in the document, used to resolve a layer-tap hold's tint and jump target. */
  layers?: readonly Layer[];
  /** Fires when a layer-tinted hold legend is clicked, switching the canvas to that layer. */
  onJumpToLayer?: (layerName: string) => void;
  /** Document-level macro registry, used to resolve a key's macro reference to its display glyph. */
  macros?: MacroRegistry;
}

type Direction = "up" | "down" | "left" | "right";

function positionCenter(element: (typeof boardGeometry)[number]) {
  return element.kind === "encoder"
    ? { x: element.x, y: element.y }
    : { x: element.x + element.w / 2, y: element.y + element.h / 2 };
}

function nearestPosition(id: string, direction: Direction) {
  const current = boardGeometry.find((element) => element.id === id);
  if (!current) return undefined;
  const origin = positionCenter(current);

  return boardGeometry
    .filter((candidate) => {
      if (candidate.id === id) return false;
      const point = positionCenter(candidate);
      if (direction === "up") return point.y < origin.y;
      if (direction === "down") return point.y > origin.y;
      if (direction === "left") return point.x < origin.x;
      return point.x > origin.x;
    })
    .map((candidate) => {
      const point = positionCenter(candidate);
      return {
        candidate,
        distance: (point.x - origin.x) ** 2 + (point.y - origin.y) ** 2,
      };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.candidate;
}

/** Inline-SVG render of the full Sofle Choc board with selectable, legended keys. */
export function KeyboardCanvas({
  legends = {},
  selectedKeyId = null,
  onSelectKey,
  layerColor,
  homingKeys,
  layers,
  onJumpToLayer,
  macros,
}: KeyboardCanvasProps = {}) {
  // Hover tracking is delegated on the <svg> rather than wired per-Keycap, so
  // the tooltip's DOM-rect anchoring stays independent of the SVG render tree.
  const [hover, setHover] = useState<{ id: string; rect: DOMRect } | null>(null);
  const [focusAnchorId, setFocusAnchorId] = useState(selectedKeyId ?? boardGeometry[0].id);
  const positionRefs = useRef(new Map<string, SVGGElement>());

  const moveFocus = (id: string, direction: Direction) => {
    const next = nearestPosition(id, direction);
    if (!next) return;
    setFocusAnchorId(next.id);
    positionRefs.current.get(next.id)?.focus();
  };

  const handlePositionKeyDown = (event: KeyboardEvent<SVGGElement>, id: string) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveFocus(id, "right");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(id, "down");
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveFocus(id, "left");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(id, "up");
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectKey?.(id);
    }
  };

  const hoveredLegend = hover ? legends[hover.id] : undefined;

  return (
    <>
      <svg
        role="img"
        aria-label="Sofle Choc keyboard"
        viewBox={viewBox()}
        style={{ width: "100%", height: "auto", background: BACKGROUND }}
        onMouseOver={(e) => {
          const target = (e.target as Element).closest("[data-key-id]");
          if (!target) return;
          setHover({ id: target.getAttribute("data-key-id")!, rect: target.getBoundingClientRect() });
        }}
        onMouseOut={(e) => {
          const target = (e.target as Element).closest("[data-key-id]");
          if (!target) return;
          const related = e.relatedTarget as Node | null;
          if (related && target.contains(related)) return;
          setHover(null);
        }}
        onFocus={(e) => {
          const target = (e.target as Element).closest("[data-key-id]");
          if (!target) return;
          setHover({ id: target.getAttribute("data-key-id")!, rect: target.getBoundingClientRect() });
        }}
        onBlur={(e) => {
          const target = (e.target as Element).closest("[data-key-id]");
          if (!target) return;
          setHover(null);
        }}
      >
        {[...keys, ...encoders].map((element) => (
          <Keycap
            key={element.id}
            element={element}
            legend={legends[element.id]}
            selected={element.id === selectedKeyId}
            onSelect={onSelectKey}
            layerColor={layerColor}
            homing={homingKeys?.has(element.id)}
            layers={layers}
            onJumpToLayer={onJumpToLayer}
            macros={macros}
            hasTooltip={hover?.id === element.id && Boolean(hoveredLegend)}
            tabIndex={element.id === focusAnchorId ? 0 : -1}
            onFocus={setFocusAnchorId}
            onKeyDown={handlePositionKeyDown}
            elementRef={(node) => {
              if (node) positionRefs.current.set(element.id, node);
              else positionRefs.current.delete(element.id);
            }}
          />
        ))}
      </svg>
      {hover && hoveredLegend ? (
        <KeyTooltip
          keyId={hover.id}
          legend={hoveredLegend}
          macros={macros ?? {}}
          layers={layers ?? []}
          anchorRect={hover.rect}
        />
      ) : null}
    </>
  );
}
