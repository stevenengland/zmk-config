import type { BoardElement } from "../model/geometry";
import type { KeyLegend } from "../model/schema";
import {
  boxOf,
  type Box,
  CORNER_RADIUS,
  ENCODER_FILL,
  ENCODER_STROKE,
  HOLD_SIZE,
  holdUnderlineRect,
  homingBarRect,
  KEY_EDGE_ACCENT,
  KEY_EDGE_ACCENT_WIDTH,
  KEY_FILL,
  KEY_STROKE,
  keyEdgeAccentPath,
  layerTickPath,
  LEGEND_COLOR,
  LEGEND_FONT,
  PAD,
  PRIMARY_SIZE,
  SUB_SIZE,
} from "../model/renderStyle";

// Active state uses the "Engineering Chic" primary teal (docs/design/stitch.md).
const SELECTED_FILL = "#0b3a42";
const SELECTED_STROKE = "#00e5ff";

interface KeycapProps {
  element: BoardElement;
  legend?: KeyLegend;
  selected?: boolean;
  onSelect?: (id: string) => void;
  /** Active layer's color, painted as a corner tick over the top-right border. */
  layerColor?: string;
  /** Board-wide physical property: renders a bottom-edge bar, same on every layer. */
  homing?: boolean;
}

/**
 * Corner legends per the PRD layout: primary bottom-left (larger, may carry a
 * per-key color), shifted top-left, altgr bottom-right. The top-right corner
 * carries the layer tick on the border, leaving the interior free for the
 * behavior stack. Empty slots render nothing.
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

/** Hold slot: top-right behavior stack, row one — glyph end-aligned over a solid underline. */
function HoldRow({ glyph, box }: { glyph: string; box: Box }) {
  const underline = holdUnderlineRect(box);
  return (
    <>
      <text
        x={box.right - PAD}
        y={box.top + PAD}
        textAnchor="end"
        dominantBaseline="hanging"
        fontFamily={LEGEND_FONT}
        fontSize={HOLD_SIZE}
        fill={LEGEND_COLOR}
      >
        {glyph}
      </text>
      <rect {...underline} fill={LEGEND_COLOR} />
    </>
  );
}

/**
 * Renders one board element as an SVG group with its corner legends. Clicking
 * selects it; the selected element is highlighted with the primary teal.
 * Rotation, when present, is applied about the element centre.
 */
export function Keycap({ element, legend, selected, onSelect, layerColor, homing }: KeycapProps) {
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

  const isKey = element.kind === "key";

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
      {isKey && !selected ? (
        <path
          d={keyEdgeAccentPath(box)}
          fill="none"
          stroke={KEY_EDGE_ACCENT}
          strokeWidth={KEY_EDGE_ACCENT_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {isKey && layerColor ? (
        <path
          d={layerTickPath(box)}
          fill="none"
          stroke={layerColor}
          strokeWidth={KEY_EDGE_ACCENT_WIDTH}
          strokeLinecap="round"
        />
      ) : null}
      {isKey && homing ? <rect {...homingBarRect(box)} fill={KEY_STROKE} /> : null}
      {isKey && legend?.hold ? <HoldRow glyph={legend.hold.glyph} box={box} /> : null}
      {legend ? <Legends legend={legend} box={box} /> : null}
    </g>
  );
}
