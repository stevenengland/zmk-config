import { useEffect, useState, type CSSProperties } from "react";
import { isLayerHold, LATCH_NOTE, type HoldBinding } from "../model/schema";
import { convertLegendInput } from "../model/codepoint";

// Colors drawn from the "Engineering Chic" colorset (docs/design/stitch.md), matching KeyEditorPanel.
const FIELD_BG = "#0e0e0e";
const OUTLINE = "#849396";
const ON_SURFACE = "#e5e2e1";
const ON_SURFACE_VARIANT = "#bac9cc";

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

// The latch checkbox reads as a sentence, not as a form field: it sits inline
// with its box rather than stacked under an uppercase caption like the inputs.
const latchLabel: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 12,
  fontFamily: "JetBrains Mono, monospace",
  fontSize: 11,
  color: ON_SURFACE_VARIANT,
};

interface BindingEditorProps {
  keyId: string | null;
  hold?: HoldBinding;
  onSetHold: (hold: HoldBinding | undefined) => void;
  /** Registry name this key's binding references; mutually exclusive with `hold`. */
  macro?: string;
  onSetMacro: (name: string | undefined) => void;
  onError: (message: string) => void;
  /** Layer mode's target picker — every layer in the document, in document order. */
  layerNames?: readonly string[];
  /** Macro mode's target picker — every registered macro name, in registry order. */
  macroNames?: readonly string[];
}

type Mode = "glyph" | "layer" | "macro";

interface Fields {
  glyph: string;
  shifted: string;
  layer: string;
  macro: string;
}

function modeFromBinding(hold: HoldBinding | undefined, macro: string | undefined): Mode {
  if (macro) return "macro";
  return hold && isLayerHold(hold) ? "layer" : "glyph";
}

function fieldsFromBinding(hold: HoldBinding | undefined, macro: string | undefined): Fields {
  if (macro) return { glyph: "", shifted: "", layer: "", macro };
  if (hold && isLayerHold(hold)) return { glyph: "", shifted: "", layer: hold.layer, macro: "" };
  return { glyph: hold?.glyph ?? "", shifted: hold?.shifted ?? "", layer: "", macro: "" };
}

/**
 * Shared binding editor for a key's "On hold" group: Glyph mode commits a
 * glyph (+ optional shifted variant), Layer mode commits a by-name layer
 * reference, Macro mode commits a by-name macro reference. The three modes
 * are mutually exclusive — switching modes clears whichever of `hold`/`macro`
 * the new mode doesn't own.
 */
export function BindingEditor({
  keyId,
  hold,
  onSetHold,
  macro,
  onSetMacro,
  onError,
  layerNames = [],
  macroNames = [],
}: BindingEditorProps) {
  const [mode, setMode] = useState<Mode>(() => modeFromBinding(hold, macro));
  const [fields, setFields] = useState<Fields>(() => fieldsFromBinding(hold, macro));

  useEffect(() => {
    setMode(modeFromBinding(hold, macro));
    setFields(fieldsFromBinding(hold, macro));
  }, [keyId, hold, macro]);

  // A latch is a property of the binding, not of a mode: it survives edits to
  // the glyph and to the layer target, so every hold commit carries it along.
  const latch = hold?.toggle ? { toggle: true as const } : {};

  const commit = (field: "glyph" | "shifted", raw: string) => {
    const result = convertLegendInput(raw);
    if (!result.ok) {
      onError(result.error);
      setFields(fieldsFromBinding(hold, macro));
      return;
    }
    const next = { ...fields, [field]: result.glyph };
    setFields(next);
    if (!next.glyph) {
      onSetHold(undefined);
    } else {
      onSetHold({ glyph: next.glyph, ...(next.shifted ? { shifted: next.shifted } : {}), ...latch });
    }
  };

  const selectLayer = (name: string) => {
    setFields((prev) => ({ ...prev, layer: name }));
    onSetHold({ layer: name, ...latch });
  };

  const setLatch = (on: boolean) => {
    if (!hold) return;
    const base: HoldBinding = isLayerHold(hold)
      ? { layer: hold.layer }
      : { glyph: hold.glyph, ...(hold.shifted ? { shifted: hold.shifted } : {}) };
    onSetHold(on ? { ...base, toggle: true } : base);
  };

  const selectMacro = (name: string) => {
    setFields((prev) => ({ ...prev, macro: name }));
    onSetMacro(name);
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    if (next === "layer") {
      const target = fields.layer || layerNames[0];
      if (target) onSetHold({ layer: target, ...latch });
    } else if (next === "macro") {
      const target = fields.macro || macroNames[0];
      if (target) onSetMacro(target);
    } else {
      onSetHold(
        fields.glyph
          ? { glyph: fields.glyph, ...(fields.shifted ? { shifted: fields.shifted } : {}), ...latch }
          : undefined,
      );
    }
  };

  return (
    <div>
      <label style={label}>
        Binding mode
        <select
          aria-label="Binding mode"
          value={mode}
          onChange={(e) => changeMode(e.target.value as Mode)}
          style={field}
        >
          <option value="glyph">Glyph</option>
          <option value="layer">Layer</option>
          <option value="macro">Macro</option>
        </select>
      </label>
      {mode === "layer" ? (
        <label style={label}>
          Target layer
          <select
            aria-label="Target layer"
            value={fields.layer}
            onChange={(e) => selectLayer(e.target.value)}
            style={field}
          >
            {layerNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      ) : mode === "macro" ? (
        <label style={label}>
          Macro
          <select
            aria-label="Macro"
            value={fields.macro}
            onChange={(e) => selectMacro(e.target.value)}
            style={field}
          >
            {macroNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label style={label}>
            Hold glyph
            <input
              aria-label="Hold glyph"
              style={field}
              value={fields.glyph}
              onChange={(e) => setFields((prev) => ({ ...prev, glyph: e.target.value }))}
              onBlur={(e) => commit("glyph", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit("glyph", e.currentTarget.value);
              }}
            />
          </label>
          <label style={label}>
            Hold shifted glyph
            <input
              aria-label="Hold shifted glyph"
              style={field}
              value={fields.shifted}
              onChange={(e) => setFields((prev) => ({ ...prev, shifted: e.target.value }))}
              onBlur={(e) => commit("shifted", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit("shifted", e.currentTarget.value);
              }}
            />
          </label>
        </>
      )}
      {mode === "macro" ? null : (
        <label style={latchLabel}>
          <input
            type="checkbox"
            aria-label={LATCH_NOTE}
            checked={hold?.toggle ?? false}
            disabled={!hold}
            onChange={(e) => setLatch(e.target.checked)}
          />
          Latching — {LATCH_NOTE}
        </label>
      )}
    </div>
  );
}
