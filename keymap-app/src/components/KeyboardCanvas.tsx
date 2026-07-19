import { useState } from "react";
import { boardGeometry, keys, encoders } from "../model/geometry";
import type { KeyLegend, Layer, MacroRegistry } from "../model/schema";
import { BACKGROUND, boardViewBox } from "../model/renderStyle";
import { Keycap } from "./Keycap";
import { KeyTooltip } from "./KeyTooltip";
import { useBoardNavigation } from "./useBoardNavigation";

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
  /** Shows first-session keyboard guidance when true; when false, keeps only the board summary. */
  guidanceVisible?: boolean;
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
  guidanceVisible,
}: KeyboardCanvasProps = {}) {
  // Hover tracking is delegated on the <svg> rather than wired per-Keycap, so
  // the tooltip's DOM-rect anchoring stays independent of the SVG render tree.
  const [hover, setHover] = useState<{ id: string; rect: DOMRect } | null>(null);
  const navigation = useBoardNavigation({
    elements: boardGeometry,
    selectedId: selectedKeyId,
    onActivate: onSelectKey,
  });

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
            layerColor={layerColor}
            homing={homingKeys?.has(element.id)}
            layers={layers}
            onJumpToLayer={onJumpToLayer}
            macros={macros}
            hasTooltip={hover?.id === element.id}
            {...navigation.positionProps(element.id)}
          />
        ))}
      </svg>
      {guidanceVisible !== undefined ? (
        <div
          aria-label="Board navigation"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            paddingTop: 10,
            color: "#bac9cc",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 12,
          }}
        >
          <strong style={{ color: "#e5e2e1" }}>58 keys · 2 encoders</strong>
          {guidanceVisible ? <span>Use arrow keys to move; press Enter or Space to edit.</span> : null}
        </div>
      ) : null}
      {hover ? (
        <KeyTooltip
          keyId={hover.id}
          legend={legends[hover.id]}
          macros={macros ?? {}}
          layers={layers ?? []}
          anchorRect={hover.rect}
        />
      ) : null}
    </>
  );
}
