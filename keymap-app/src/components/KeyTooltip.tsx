import { Fragment, type CSSProperties } from "react";
import { resolveTooltipRows, type KeyLegend, type Layer, type MacroRegistry } from "../model/schema";
import { MONO_FONT } from "../model/renderStyle";

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
  legend: KeyLegend;
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
  const rows = resolveTooltipRows(legend, macros, layers);
  if (rows.length === 0) return null;

  return (
    <div role="tooltip" data-tooltip-for={keyId} style={{ ...tooltip, left: anchorRect.left, top: anchorRect.bottom + 6 }}>
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
