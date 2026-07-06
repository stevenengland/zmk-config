import { boardGeometry, keys, encoders } from "../model/geometry";
import type { KeyLegend } from "../model/schema";
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
}

/** Inline-SVG render of the full Sofle Choc board with selectable, legended keys. */
export function KeyboardCanvas({
  legends = {},
  selectedKeyId = null,
  onSelectKey,
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
        />
      ))}
    </svg>
  );
}
