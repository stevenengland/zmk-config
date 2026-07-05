import { boardGeometry, keys, encoders } from "../model/geometry";
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

/** Read-only inline-SVG render of the full Sofle Choc board. */
export function KeyboardCanvas() {
  return (
    <svg
      role="img"
      aria-label="Sofle Choc keyboard"
      viewBox={viewBox()}
      style={{ width: "100%", height: "auto", background: BACKGROUND }}
    >
      {keys.map((element) => (
        <Keycap key={element.id} element={element} />
      ))}
      {encoders.map((element) => (
        <Keycap key={element.id} element={element} />
      ))}
    </svg>
  );
}
