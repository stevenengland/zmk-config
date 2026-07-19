import { Fragment, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { describeElementId } from "../model/geometry";
import { resolveTooltipRows, type KeyLegend, type Layer, type MacroRegistry } from "../model/schema";
import { MONO_FONT } from "../model/renderStyle";

// Gap between the tooltip and the key it describes, on whichever side it lands.
const VIEWPORT_MARGIN = 6;

// "Engineering Chic" colorset (docs/design/stitch.md), matching KeyEditorPanel.
const SURFACE = "#131313";
const OUTLINE_VARIANT = "#3b494c";
const ON_SURFACE = "#e5e2e1";
const ON_SURFACE_VARIANT = "#bac9cc";

interface AnchorRect {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

interface KeyTooltipProps {
  keyId: string;
  legend?: KeyLegend;
  macros: MacroRegistry;
  layers: readonly Layer[];
  anchorRect: AnchorRect;
}

const tooltip: CSSProperties = {
  position: "fixed",
  pointerEvents: "none",
  zIndex: 1000,
  background: SURFACE,
  border: `1px solid ${OUTLINE_VARIANT}`,
  borderRadius: 4,
  padding: "8px 10px",
  fontFamily: MONO_FONT,
  fontSize: 11,
  color: ON_SURFACE,
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  columnGap: 12,
  rowGap: 4,
  whiteSpace: "nowrap",
};

/**
 * Hover overlay showing a key's full state matrix — the detail layer that
 * keeps the cap itself minimal (PRD decision anchor D6). Anchored to the
 * hovered key's bounding box; never intercepts pointer events, so it can
 * never block clicking or selecting the key underneath it.
 */
export function KeyTooltip({ keyId, legend, macros, layers, anchorRect }: KeyTooltipProps) {
  const resolvedRows = legend ? resolveTooltipRows(legend, macros, layers) : [];
  const rows = resolvedRows.length > 0
    ? resolvedRows
    : [
        { label: "legend", value: "Empty" },
        { label: "behavior", value: "None" },
      ];
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState({ left: anchorRect.left, top: anchorRect.bottom + VIEWPORT_MARGIN });

  // Measured after the tooltip is in the DOM (but before paint), so a key near
  // the viewport's bottom or right edge — the thumb cluster and outer pinky
  // columns, which carry the deepest hold/tap-dance stacks — never clips.
  useLayoutEffect(() => {
    if (!ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();

    let left = anchorRect.left;
    if (left + width > window.innerWidth) left = window.innerWidth - width - VIEWPORT_MARGIN;

    let top = anchorRect.bottom + VIEWPORT_MARGIN;
    if (top + height > window.innerHeight) top = anchorRect.top - height - VIEWPORT_MARGIN;

    setPlacement({ left, top });
  }, [anchorRect.left, anchorRect.top, anchorRect.bottom]);

  return (
    <div
      ref={ref}
      role="tooltip"
      id={`key-tooltip-${keyId}`}
      data-tooltip-for={keyId}
      style={{ ...tooltip, left: placement.left, top: placement.top }}
    >
      <span style={{ color: ON_SURFACE_VARIANT }}>position</span>
      <span>{describeElementId(keyId)}</span>
      {rows.map((row, index) => (
        <Fragment key={`${row.label}-${index}`}>
          <span style={{ color: ON_SURFACE_VARIANT }}>{row.label}</span>
          <span>
            {row.value}
            {row.note ? <span style={{ color: ON_SURFACE_VARIANT }}> · {row.note}</span> : null}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
