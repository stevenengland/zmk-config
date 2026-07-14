import { useEffect, useState, type CSSProperties } from "react";
import { isLayerHold, type HoldBinding } from "../model/schema";
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

interface BindingEditorProps {
  keyId: string | null;
  hold?: HoldBinding;
  onSetHold: (hold: HoldBinding | undefined) => void;
  onError: (message: string) => void;
  /** Layer mode's target picker — every layer in the document, in document order. */
  layerNames?: readonly string[];
}

type Mode = "glyph" | "layer";

interface Fields {
  glyph: string;
  shifted: string;
  layer: string;
}

function modeFromHold(hold?: HoldBinding): Mode {
  return hold && isLayerHold(hold) ? "layer" : "glyph";
}

function fieldsFromHold(hold?: HoldBinding): Fields {
  if (hold && isLayerHold(hold)) return { glyph: "", shifted: "", layer: hold.layer };
  return { glyph: hold?.glyph ?? "", shifted: hold?.shifted ?? "", layer: "" };
}

/**
 * Shared binding editor for a key's "On hold" group: Glyph mode commits a
 * glyph (+ optional shifted variant), Layer mode commits a by-name layer
 * reference. Macro is previewed but not yet selectable (PRD #28, later slice).
 */
export function BindingEditor({ keyId, hold, onSetHold, onError, layerNames = [] }: BindingEditorProps) {
  const [mode, setMode] = useState<Mode>(() => modeFromHold(hold));
  const [fields, setFields] = useState<Fields>(() => fieldsFromHold(hold));

  useEffect(() => {
    setMode(modeFromHold(hold));
    setFields(fieldsFromHold(hold));
  }, [keyId, hold]);

  const commit = (field: "glyph" | "shifted", raw: string) => {
    const result = convertLegendInput(raw);
    if (!result.ok) {
      onError(result.error);
      setFields(fieldsFromHold(hold));
      return;
    }
    const next = { ...fields, [field]: result.glyph };
    setFields(next);
    if (!next.glyph) {
      onSetHold(undefined);
    } else {
      onSetHold({ glyph: next.glyph, ...(next.shifted ? { shifted: next.shifted } : {}) });
    }
  };

  const selectLayer = (name: string) => {
    setFields((prev) => ({ ...prev, layer: name }));
    onSetHold({ layer: name });
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    if (next === "layer") {
      const target = fields.layer || layerNames[0];
      if (target) onSetHold({ layer: target });
    } else {
      onSetHold(fields.glyph ? { glyph: fields.glyph, ...(fields.shifted ? { shifted: fields.shifted } : {}) } : undefined);
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
          <option value="macro" disabled>
            Macro
          </option>
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
    </div>
  );
}
