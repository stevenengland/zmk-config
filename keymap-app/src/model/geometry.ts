// Static, hand-derived Sofle Choc board geometry (PRD decision D3).
//
// Coordinates are in SVG user units with each key drawn as a KEY x KEY rounded
// rect. The layout mirrors the physical Sofle Choc: two 6-column x 4-row halves
// with a five-key rotated thumb cluster each, plus one rotary encoder per half.
// Column stagger and thumb rotation are eyeballed against the reference
// illustration; per the PRD fidelity escape hatch, coordinate corrections land
// as follow-up commits without re-litigating this table's shape.

export type ElementKind = "key" | "encoder";

export interface BoardElement {
  /** `L-r<row>-c<col>` / `R-r<row>-c<col>` for keys; `L-enc` / `R-enc` for encoders. */
  id: string;
  kind: ElementKind;
  /** Top-left corner (keys) or centre (encoders), in SVG user units. */
  x: number;
  y: number;
  /** Bounding size; encoders are square so `w === h === diameter`. */
  w: number;
  h: number;
  /** Clockwise degrees; rotates about the element centre. Absent when 0. */
  rotation?: number;
}

const KEY = 54;
const GAP = 6;
const STEP = KEY + GAP;

const MAIN_ROWS = 4;
const MAIN_COLS = 6;

// Per-column vertical stagger for the left half, outer pinky (c0) to inner (c5).
const STAGGER_LEFT = [8, 4, 0, 6, 20, 24];
// Right half mirrors the finger stagger: its inner column (c0) matches the
// left inner column, its outer column (c5) matches the left pinky.
const STAGGER_RIGHT = [...STAGGER_LEFT].reverse();

const LEFT_WIDTH = MAIN_COLS * STEP;
// Widened center valley so the two rotary encoders sit side by side between the
// halves, matching the physical Sofle Choc Pro BT rather than tucking inboard.
const CENTER_GAP = 3 * STEP;
const RIGHT_ORIGIN_X = LEFT_WIDTH + CENTER_GAP;

// Thumb clusters: five keys each, the two innermost rotated toward the centre.
// [col, x, y, rotation] in the same user-unit space as the main matrix.
const THUMB_BASE_Y = MAIN_ROWS * STEP + 24;

const THUMB_LEFT: Array<[number, number, number, number]> = [
  [0, 1.5 * STEP, THUMB_BASE_Y, 0],
  [1, 2.5 * STEP, THUMB_BASE_Y, 0],
  [2, 3.5 * STEP, THUMB_BASE_Y, 0],
  [3, 3.5 * STEP + 52, THUMB_BASE_Y + 34, 18],
  [4, 3.5 * STEP + 100, THUMB_BASE_Y + 78, 30],
];

const mirrorX = (x: number): number => RIGHT_ORIGIN_X + (LEFT_WIDTH - KEY - x);

const THUMB_RIGHT: Array<[number, number, number, number]> = THUMB_LEFT.map(
  ([col, x, y, rot]) => [col, mirrorX(x), y, -rot],
);

function mainMatrix(
  side: "L" | "R",
  originX: number,
  stagger: readonly number[],
): BoardElement[] {
  const out: BoardElement[] = [];
  for (let row = 0; row < MAIN_ROWS; row++) {
    for (let col = 0; col < MAIN_COLS; col++) {
      out.push({
        id: `${side}-r${row}-c${col}`,
        kind: "key",
        x: originX + col * STEP,
        y: row * STEP + stagger[col],
        w: KEY,
        h: KEY,
      });
    }
  }
  return out;
}

function thumbCluster(
  side: "L" | "R",
  cluster: ReadonlyArray<readonly [number, number, number, number]>,
): BoardElement[] {
  return cluster.map(([col, x, y, rotation]) => ({
    id: `${side}-r4-c${col}`,
    kind: "key" as const,
    x,
    y,
    w: KEY,
    h: KEY,
    ...(rotation !== 0 ? { rotation } : {}),
  }));
}

const ENCODER_DIAMETER = 62;

// Rotary encoders flank the center valley, side by side and split symmetrically
// about the valley's centre line — the left encoder just right of the left inner
// column (B/G), the right encoder just left of the right inner column (N/H), at
// the same height. This is the physically accurate position on the user's Sofle
// Choc Pro BT, not a divergence from it. For encoders `x`/`y` is the circle centre.
const ENCODER_Y = 3.1 * STEP;
// Valley centre: midpoint between the left inner column's right edge and the
// right half's inner edge.
const VALLEY_CENTER_X = (LEFT_WIDTH - GAP + RIGHT_ORIGIN_X) / 2;
const ENCODER_HALF_SPACING = ENCODER_DIAMETER / 2 + 4; // 4px gap between the pair

const encoderLeft: BoardElement = {
  id: "L-enc",
  kind: "encoder",
  x: VALLEY_CENTER_X - ENCODER_HALF_SPACING,
  y: ENCODER_Y,
  w: ENCODER_DIAMETER,
  h: ENCODER_DIAMETER,
};

const encoderRight: BoardElement = {
  id: "R-enc",
  kind: "encoder",
  x: VALLEY_CENTER_X + ENCODER_HALF_SPACING,
  y: ENCODER_Y,
  w: ENCODER_DIAMETER,
  h: ENCODER_DIAMETER,
};

export const keys: readonly BoardElement[] = Object.freeze([
  ...mainMatrix("L", 0, STAGGER_LEFT),
  ...thumbCluster("L", THUMB_LEFT),
  ...mainMatrix("R", RIGHT_ORIGIN_X, STAGGER_RIGHT),
  ...thumbCluster("R", THUMB_RIGHT),
]);

export const encoders: readonly BoardElement[] = Object.freeze([
  encoderLeft,
  encoderRight,
]);

export const boardGeometry: readonly BoardElement[] = Object.freeze([
  ...keys,
  ...encoders,
]);

const ELEMENT_ID_PATTERN = /^([LR])-r(\d+)-c(\d+)$/;

/**
 * Human-readable position for a board element id, for UI surfaces where the
 * raw `L-r2-c3` id (meaningful to firmware/matrix mapping, not at a glance)
 * shouldn't be the only label — e.g. the key editor's headline.
 */
export function describeElementId(id: string): string {
  const match = ELEMENT_ID_PATTERN.exec(id);
  if (match) {
    const [, side, row, col] = match;
    const sideLabel = side === "L" ? "Left" : "Right";
    if (Number(row) === MAIN_ROWS) return `${sideLabel} thumb`;
    return `${sideLabel} · row ${Number(row) + 1} · col ${Number(col) + 1}`;
  }
  if (id.endsWith("-enc")) {
    return id.startsWith("L") ? "Left encoder" : "Right encoder";
  }
  return id;
}
