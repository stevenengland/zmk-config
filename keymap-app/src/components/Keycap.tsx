import type { BoardElement } from "../model/geometry";

const KEY_FILL = "#2b2f36";
const KEY_STROKE = "#4a505a";
const ENCODER_FILL = "#1f2329";
const ENCODER_STROKE = "#5a6270";
const CORNER_RADIUS = 6;

interface KeycapProps {
  element: BoardElement;
}

/**
 * Renders one board element as its own SVG group: a rounded rect for keys, a
 * circle for encoders. Rotation, when present, is applied about the element
 * centre so angled thumb keys sit correctly.
 */
export function Keycap({ element }: KeycapProps) {
  const { x, y, w, h, rotation } = element;

  if (element.kind === "encoder") {
    const r = w / 2;
    return (
      <circle
        data-encoder-id={element.id}
        cx={x}
        cy={y}
        r={r}
        fill={ENCODER_FILL}
        stroke={ENCODER_STROKE}
        strokeWidth={2}
      />
    );
  }

  const cx = x + w / 2;
  const cy = y + h / 2;
  const transform =
    rotation !== undefined ? `rotate(${rotation} ${cx} ${cy})` : undefined;

  return (
    <g data-key-id={element.id} transform={transform}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={CORNER_RADIUS}
        fill={KEY_FILL}
        stroke={KEY_STROKE}
        strokeWidth={2}
      />
    </g>
  );
}
