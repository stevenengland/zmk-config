import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { KeyLegend } from "../model/schema";
import type { LegendSlot } from "../state/documentReducer";
import { convertLegendInput } from "../model/codepoint";
import { SymbolPicker } from "./SymbolPicker";

// Colors drawn from the "Engineering Chic" colorset (docs/design/stitch.md).
const SURFACE = "#131313";
const FIELD_BG = "#0e0e0e";
const OUTLINE = "#849396";
const OUTLINE_VARIANT = "#3b494c";
const ON_SURFACE = "#e5e2e1";
const ON_SURFACE_VARIANT = "#bac9cc";
const TEAL = "#00e5ff";

const DEFAULT_PRIMARY_COLOR = ON_SURFACE;

const SLOTS: ReadonlyArray<{ slot: LegendSlot; label: string; corner: string }> = [
  { slot: "primary", label: "Primary", corner: "bottom-left" },
  { slot: "shifted", label: "Shifted", corner: "top-left" },
  { slot: "altgr", label: "AltGr", corner: "bottom-right" },
];

interface KeyEditorPanelProps {
  keyId: string | null;
  /**
   * Index of the layer the editor targets. Board key ids are position-based and
   * shared across every layer, so picking the same physical key on a different
   * layer in the All view leaves `keyId` unchanged; keying focus-on-select on
   * `activeIndex` too makes it re-fire on that cross-layer switch.
   */
  activeIndex: number;
  legend: KeyLegend;
  onSetSlot: (slot: LegendSlot, glyph: string) => void;
  onSetColor: (color: string) => void;
  onError: (message: string) => void;
}

const panel: CSSProperties = {
  width: 320,
  boxSizing: "border-box",
  padding: 16,
  borderLeft: `1px solid ${OUTLINE_VARIANT}`,
  background: SURFACE,
  color: ON_SURFACE,
  fontFamily: "Inter, system-ui, sans-serif",
};

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
  marginBottom: 12,
  background: FIELD_BG,
  border: `1px solid ${OUTLINE}`,
  borderRadius: 4,
  color: ON_SURFACE,
  fontFamily: "JetBrains Mono, monospace",
};

type Fields = Record<LegendSlot, string>;

function fieldsFromLegend(legend: KeyLegend): Fields {
  return {
    primary: legend.primary ?? "",
    shifted: legend.shifted ?? "",
    altgr: legend.altgr ?? "",
  };
}

/**
 * Side panel bound to the selected key. Each slot field commits on blur or
 * Enter: `U+XXXX` input converts to its glyph, an invalid codepoint routes to
 * the status bar and leaves the slot untouched, and an empty field clears the
 * slot. The color control recolors the key's primary legend.
 */
export function KeyEditorPanel({
  keyId,
  activeIndex,
  legend,
  onSetSlot,
  onSetColor,
  onError,
}: KeyEditorPanelProps) {
  const [fields, setFields] = useState<Fields>(() => fieldsFromLegend(legend));
  // The slot a picked symbol lands in; follows field focus, primary by default.
  const [activeSlot, setActiveSlot] = useState<LegendSlot>("primary");
  const primaryInputRef = useRef<HTMLInputElement | null>(null);
  // Mirrors the latest legend without being a focus-effect dependency, so
  // focus-on-select re-fires only on an actual key change, never on a
  // same-key legend update.
  const legendRef = useRef(legend);
  legendRef.current = legend;

  // Re-bind the fields whenever the selected key or its committed legend changes.
  useEffect(() => {
    setFields(fieldsFromLegend(legend));
  }, [keyId, legend]);

  // Focus-on-select: move focus into the primary field and select its text
  // each time the selected key changes, so typing overwrites immediately. The
  // value is pre-synced imperatively because the fields-sync effect above
  // commits the new legend text one render later than this effect runs.
  useEffect(() => {
    if (keyId === null) return;
    const input = primaryInputRef.current;
    if (!input) return;
    input.value = legendRef.current.primary ?? "";
    input.focus();
    input.select();
  }, [keyId, activeIndex]);

  if (keyId === null) {
    return (
      <aside style={panel} aria-label="Key editor">
        <p style={{ color: ON_SURFACE_VARIANT, fontSize: 14 }}>Select a key to edit its legends.</p>
      </aside>
    );
  }

  const commit = (slot: LegendSlot, raw: string) => {
    const result = convertLegendInput(raw);
    if (!result.ok) {
      onError(result.error);
      setFields(fieldsFromLegend(legend));
      return;
    }
    setFields((prev) => ({ ...prev, [slot]: result.glyph }));
    onSetSlot(slot, result.glyph);
  };

  return (
    <aside style={panel} aria-label="Key editor">
      <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 16px" }}>{keyId}</h2>

      {SLOTS.map(({ slot, label: text }) => (
        <label key={slot} style={label}>
          {text}
          <input
            ref={slot === "primary" ? primaryInputRef : undefined}
            aria-label={`${text} legend`}
            style={field}
            value={fields[slot]}
            onFocus={() => setActiveSlot(slot)}
            onChange={(e) => setFields((prev) => ({ ...prev, [slot]: e.target.value }))}
            onBlur={(e) => commit(slot, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(slot, e.currentTarget.value);
            }}
          />
        </label>
      ))}

      <SymbolPicker onInsert={(glyph) => commit(activeSlot, glyph)} />

      <label style={label}>
        Primary color
        <input
          aria-label="Primary color"
          type="color"
          value={legend.color ?? DEFAULT_PRIMARY_COLOR}
          onChange={(e) => onSetColor(e.target.value)}
          style={{
            width: 40,
            height: 32,
            padding: 0,
            border: `1px solid ${OUTLINE}`,
            borderRadius: 4,
            background: "transparent",
            cursor: "pointer",
          }}
        />
      </label>
      <button
        type="button"
        className="km-btn"
        onClick={() => onSetColor("")}
        style={{
          appearance: "none",
          marginTop: 8,
          background: "#1a1d22",
          border: `1px solid ${OUTLINE_VARIANT}`,
          borderRadius: 4,
          color: legend.color ? ON_SURFACE : ON_SURFACE_VARIANT,
          height: 28,
          padding: "0 10px",
          cursor: "pointer",
          outlineColor: TEAL,
        }}
      >
        Reset color
      </button>
    </aside>
  );
}
