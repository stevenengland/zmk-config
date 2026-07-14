import { boardGeometry, keys, encoders } from "../model/geometry";
import type { KeyLegend, Layer } from "../model/schema";
import { BACKGROUND, boardViewBox } from "../model/renderStyle";
import { Keycap } from "./Keycap";

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
}: KeyboardCanvasProps = {}) {
  return (
    <svg
      role="img"
      aria-label="Sofle Choc keyboard"
      viewBox={viewBox()}
      style={{ width: "100%", height: "auto", background: BACKGROUND }}
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
        />
      ))}
    </svg>
  );
}
