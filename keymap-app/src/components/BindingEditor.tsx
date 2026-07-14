import { useEffect, useState, type CSSProperties } from "react";
import type { HoldBinding } from "../model/schema";
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
}

interface Fields {
  glyph: string;
  shifted: string;
}

function fieldsFromHold(hold?: HoldBinding): Fields {
  return { glyph: hold?.glyph ?? "", shifted: hold?.shifted ?? "" };
}

/**
 * Shared binding editor for a key's "On hold" group. Only glyph mode is wired
 * this slice — the mode select previews the eventual Glyph / Layer / Macro
 * switch (PRD #28) with Layer and Macro disabled until those slices land.
 */
export function BindingEditor({ keyId, hold, onSetHold, onError }: BindingEditorProps) {
  const [fields, setFields] = useState<Fields>(() => fieldsFromHold(hold));

  useEffect(() => {
    setFields(fieldsFromHold(hold));
  }, [keyId, hold]);

  const commit = (field: keyof Fields, raw: string) => {
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

  return (
    <div>
      <label style={label}>
        Binding mode
        <select aria-label="Binding mode" defaultValue="glyph" style={field}>
          <option value="glyph">Glyph</option>
          <option value="layer" disabled>
            Layer
          </option>
          <option value="macro" disabled>
            Macro
          </option>
        </select>
      </label>
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
    </div>
  );
}
