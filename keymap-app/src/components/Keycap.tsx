import type { BoardElement } from "../model/geometry";
import type { KeyLegend } from "../model/schema";

const KEY_FILL = "#2b2f36";
const KEY_STROKE = "#4a505a";
const ENCODER_FILL = "#1f2329";
const ENCODER_STROKE = "#5a6270";
// Active state uses the "Engineering Chic" primary teal (docs/design/stitch.md).
const SELECTED_FILL = "#0b3a42";
const SELECTED_STROKE = "#00e5ff";
const CORNER_RADIUS = 6;

const LEGEND_FONT = "JetBrains Mono, monospace";
const LEGEND_COLOR = "#e5e2e1";
const PRIMARY_SIZE = 18;
const SUB_SIZE = 12;
const PAD = 9;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface KeycapProps {
  element: BoardElement;
  legend?: KeyLegend;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

function boxOf(element: BoardElement): Box {
  const { x, y, w, h } = element;
  if (element.kind === "encoder") {
    const r = w / 2;
    return { left: x - r, top: y - r, right: x + r, bottom: y + r };
  }
  return { left: x, top: y, right: x + w, bottom: y + h };
}

/**
 * Corner legends per the PRD layout: primary bottom-left (larger, may carry a
 * per-key color), shifted top-left, altgr bottom-right. The top-right corner is
 * reserved for a future layer reference and always renders blank. Empty slots
 * render nothing.
 */
function Legends({ legend, box }: { legend: KeyLegend; box: Box }) {
  return (
    <>
      {legend.shifted ? (
        <text
          x={box.left + PAD}
          y={box.top + PAD}
          textAnchor="start"
          dominantBaseline="hanging"
          fontFamily={LEGEND_FONT}
          fontSize={SUB_SIZE}
          fill={LEGEND_COLOR}
        >
          {legend.shifted}
        </text>
      ) : null}
      {legend.altgr ? (
        <text
          x={box.right - PAD}
          y={box.bottom - PAD}
          textAnchor="end"
          fontFamily={LEGEND_FONT}
          fontSize={SUB_SIZE}
          fill={LEGEND_COLOR}
        >
          {legend.altgr}
        </text>
      ) : null}
      {legend.primary ? (
        <text
          x={box.left + PAD}
          y={box.bottom - PAD}
          textAnchor="start"
          fontFamily={LEGEND_FONT}
          fontSize={PRIMARY_SIZE}
          fontWeight={600}
          fill={legend.color ?? LEGEND_COLOR}
        >
          {legend.primary}
        </text>
      ) : null}
    </>
  );
}

/**
 * Renders one board element as an SVG group with its corner legends. Clicking
 * selects it; the selected element is highlighted with the primary teal.
 * Rotation, when present, is applied about the element centre.
 */
export function Keycap({ element, legend, selected, onSelect }: KeycapProps) {
  const { x, y, w, h, rotation } = element;
  const box = boxOf(element);
  const idAttr =
    element.kind === "encoder"
      ? { "data-encoder-id": element.id }
      : { "data-key-id": element.id };

  const shape =
    element.kind === "encoder" ? (
      <circle
        cx={x}
        cy={y}
        r={w / 2}
        fill={selected ? SELECTED_FILL : ENCODER_FILL}
        stroke={selected ? SELECTED_STROKE : ENCODER_STROKE}
        strokeWidth={selected ? 3 : 2}
      />
    ) : (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={CORNER_RADIUS}
        fill={selected ? SELECTED_FILL : KEY_FILL}
        stroke={selected ? SELECTED_STROKE : KEY_STROKE}
        strokeWidth={selected ? 3 : 2}
      />
    );

  const cx = x + w / 2;
  const cy = y + h / 2;
  const transform =
    element.kind === "encoder" || rotation === undefined
      ? undefined
      : `rotate(${rotation} ${cx} ${cy})`;

  return (
    <g
      {...idAttr}
      transform={transform}
      role="button"
      aria-label={element.id}
      aria-pressed={selected ?? false}
      style={{ cursor: "pointer" }}
      onClick={() => onSelect?.(element.id)}
    >
      {shape}
      {legend ? <Legends legend={legend} box={box} /> : null}
    </g>
  );
}
