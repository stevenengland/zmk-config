import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { TapBinding } from "../model/schema";
import { convertLegendInput } from "../model/codepoint";
import { FieldError } from "./FieldError";
import { useFieldFeedback } from "./useFieldFeedback";

// Colors drawn from the "Engineering Chic" colorset (docs/design/stitch.md), matching MacroManager/BindingEditor.
const FIELD_BG = "#0e0e0e";
const OUTLINE = "#849396";
const OUTLINE_VARIANT = "#3b494c";
const ON_SURFACE = "#e5e2e1";
const ON_SURFACE_VARIANT = "#bac9cc";

const MIN_TAP_COUNT = 2;

const label: CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: ON_SURFACE_VARIANT,
};

const field: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  height: 32,
  padding: "0 8px",
  marginBottom: 8,
  background: FIELD_BG,
  border: `1px solid ${OUTLINE}`,
  borderRadius: 4,
  color: ON_SURFACE,
  fontFamily: "JetBrains Mono, monospace",
};

const row: CSSProperties = {
  marginBottom: 12,
  paddingBottom: 12,
  borderBottom: `1px solid ${OUTLINE_VARIANT}`,
};

/** Clamps to the schema's minimum tap count; a non-numeric edit falls back to it. */
function clampCount(raw: string): number {
  const parsed = Math.round(Number(raw));
  return Number.isFinite(parsed) && parsed >= MIN_TAP_COUNT ? parsed : MIN_TAP_COUNT;
}

/** Strips `toggle` back to omitted (never persisted as `false`) rather than storing it. */
function withToggle(tap: TapBinding, toggle: boolean): TapBinding {
  return toggle ? { count: tap.count, glyph: tap.glyph, toggle: true } : { count: tap.count, glyph: tap.glyph };
}

interface TapRowProps {
  index: number;
  tap: TapBinding;
  onUpdate: (index: number, tap: TapBinding) => void;
  onDelete: (index: number) => void;
}

/** One tap-dance row: tap count (≥ 2), the fired glyph, and the toggle/latch flag. */
function TapRow({ index, tap, onUpdate, onDelete }: TapRowProps) {
  const [fields, setFields] = useState<TapBinding>(tap);
  const label1 = index + 1;
  const feedback = useFieldFeedback();
  const feedbackRef = useRef(feedback);
  feedbackRef.current = feedback;

  // An invalid glyph draft survives a committed change to this row's other
  // fields; the correction happens at the glyph field itself.
  useEffect(() => {
    setFields((prev) => (feedbackRef.current.error("glyph") ? { ...tap, glyph: prev.glyph } : tap));
  }, [index, tap]);

  const commitCount = (raw: string) => {
    const next = { ...fields, count: clampCount(raw) };
    setFields(next);
    onUpdate(index, next);
  };

  const commitGlyph = (raw: string) => {
    const result = convertLegendInput(raw);
    if (!result.ok) {
      feedback.report("glyph", result.error);
      setFields((prev) => ({ ...prev, glyph: raw }));
      return;
    }
    feedback.clear("glyph");
    const next = { ...fields, glyph: result.glyph };
    setFields(next);
    onUpdate(index, next);
  };

  const commitToggle = (checked: boolean) => {
    const next = withToggle(fields, checked);
    setFields(next);
    onUpdate(index, next);
  };

  return (
    <div style={row}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: ON_SURFACE, fontWeight: 600 }}>Tap {label1}</span>
        <button
          type="button"
          aria-label={`Delete tap row ${label1}`}
          onClick={() => onDelete(index)}
          style={{
            appearance: "none",
            background: "transparent",
            border: `1px solid ${OUTLINE_VARIANT}`,
            borderRadius: 4,
            color: ON_SURFACE_VARIANT,
            height: 24,
            padding: "0 8px",
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      </div>
      <label style={label}>
        Count
        <input
          type="number"
          min={MIN_TAP_COUNT}
          aria-label={`Tap row ${label1} count`}
          style={field}
          value={fields.count}
          onChange={(e) => setFields((prev) => ({ ...prev, count: Number(e.target.value) }))}
          onBlur={(e) => commitCount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitCount(e.currentTarget.value);
          }}
        />
      </label>
      <label style={label}>
        Glyph
        <input
          aria-label={`Tap row ${label1} glyph`}
          {...feedback.fieldProps("glyph", field)}
          value={fields.glyph}
          onChange={(e) => setFields((prev) => ({ ...prev, glyph: e.target.value }))}
          onBlur={(e) => commitGlyph(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitGlyph(e.currentTarget.value);
          }}
        />
      </label>
      <FieldError feedback={feedback} name="glyph" />
      <label style={{ ...label, display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          aria-label={`Tap row ${label1} toggle`}
          checked={fields.toggle ?? false}
          onChange={(e) => commitToggle(e.target.checked)}
        />
        Toggle / latch
      </label>
    </div>
  );
}

interface TapDanceListProps {
  taps: readonly TapBinding[];
  onAdd: () => void;
  onUpdate: (index: number, tap: TapBinding) => void;
  onDelete: (index: number) => void;
}

/**
 * "Tap dance" row list: one row per tap count, each committing a count
 * (≥ 2), a glyph, and an optional toggle/latch flag (PRD #28 decision
 * anchor D9's mark vocabulary). Ordering on the cap is resolved separately
 * by `resolveTapDisplays`; rows here stay in document order.
 */
export function TapDanceList({ taps, onAdd, onUpdate, onDelete }: TapDanceListProps) {
  return (
    <div>
      <span style={label}>Tap dance</span>
      {taps.map((tap, index) => (
        <TapRow key={index} index={index} tap={tap} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
      <button
        type="button"
        className="km-btn"
        onClick={onAdd}
        style={{
          appearance: "none",
          background: "#1a1d22",
          border: `1px solid ${OUTLINE_VARIANT}`,
          borderRadius: 4,
          color: ON_SURFACE,
          height: 28,
          padding: "0 10px",
          cursor: "pointer",
        }}
      >
        Add tap row
      </button>
    </div>
  );
}
