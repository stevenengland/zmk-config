import { boardGeometry, keys, encoders } from "../model/geometry";
import type { KeyLegend } from "../model/schema";
import { Keycap } from "./Keycap";

const PADDING = 40;
const BACKGROUND = "#14171c";

function viewBox(): string {
  const minX = Math.min(...boardGeometry.map((e) => e.x));
  const minY = Math.min(...boardGeometry.map((e) => e.y));
  const maxX = Math.max(...boardGeometry.map((e) => e.x + e.w));
  const maxY = Math.max(...boardGeometry.map((e) => e.y + e.h));
  const x = minX - PADDING;
  const y = minY - PADDING;
  const width = maxX - minX + 2 * PADDING;
  const height = maxY - minY + 2 * PADDING;
  return `${x} ${y} ${width} ${height}`;
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
