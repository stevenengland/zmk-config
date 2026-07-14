import { useEffect, useState, type CSSProperties } from "react";
import type { MacroDef, MacroRegistry } from "../model/schema";
import { convertLegendInput } from "../model/codepoint";

// Colors drawn from the "Engineering Chic" colorset (docs/design/stitch.md), matching KeyEditorPanel/BindingEditor.
const FIELD_BG = "#0e0e0e";
const OUTLINE = "#849396";
const OUTLINE_VARIANT = "#3b494c";
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

interface MacroRowProps {
  name: string;
  def: MacroDef;
  onUpdate: (name: string, def: MacroDef) => void;
  onDelete: (name: string) => void;
  onError: (message: string) => void;
}

/** One registry entry: name is fixed at creation, glyph/label/steps commit on blur or Enter. */
function MacroRow({ name, def, onUpdate, onDelete, onError }: MacroRowProps) {
  const [fields, setFields] = useState<MacroDef>(def);

  useEffect(() => {
    setFields(def);
  }, [name, def]);

  const commitGlyph = (raw: string) => {
    const result = convertLegendInput(raw);
    if (!result.ok) {
      onError(result.error);
      setFields(def);
      return;
    }
    const next = { ...fields, glyph: result.glyph };
    setFields(next);
    onUpdate(name, next);
  };

  const commitText = (slot: "label" | "steps", raw: string) => {
    const next = { ...fields, [slot]: raw };
    setFields(next);
    onUpdate(name, next);
  };

  return (
    <div style={row}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: ON_SURFACE, fontWeight: 600 }}>{name}</span>
        <button
          type="button"
          aria-label={`Delete ${name}`}
          onClick={() => onDelete(name)}
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
        Glyph
        <input
          aria-label={`${name} glyph`}
          style={field}
          value={fields.glyph}
          onChange={(e) => setFields((prev) => ({ ...prev, glyph: e.target.value }))}
          onBlur={(e) => commitGlyph(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitGlyph(e.currentTarget.value);
          }}
        />
      </label>
      <label style={label}>
        Label
        <input
          aria-label={`${name} label`}
          style={field}
          value={fields.label}
          onChange={(e) => setFields((prev) => ({ ...prev, label: e.target.value }))}
          onBlur={(e) => commitText("label", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitText("label", e.currentTarget.value);
          }}
        />
      </label>
      <label style={label}>
        Steps
        <input
          aria-label={`${name} steps`}
          style={field}
          value={fields.steps}
          onChange={(e) => setFields((prev) => ({ ...prev, steps: e.target.value }))}
          onBlur={(e) => commitText("steps", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitText("steps", e.currentTarget.value);
          }}
        />
      </label>
    </div>
  );
}

interface MacroManagerProps {
  macros: MacroRegistry;
  onAdd: (name: string, def: MacroDef) => void;
  onUpdate: (name: string, def: MacroDef) => void;
  onDelete: (name: string) => void;
  onError: (message: string) => void;
}

/**
 * Document-level macro registry manager: name, glyph, label, and steps per
 * entry (PRD #28 decision anchor D3). Name is set once at creation and is
 * not itself editable — editing glyph/label/steps fans out to every
 * referencing key by the shared by-name lookup; deleting an entry is handled
 * by the caller's `onDelete`, which also clears every reference to it.
 */
export function MacroManager({ macros, onAdd, onUpdate, onDelete, onError }: MacroManagerProps) {
  const [newName, setNewName] = useState("");
  const [newGlyph, setNewGlyph] = useState("");

  const addMacro = () => {
    const name = newName.trim();
    if (!name) {
      onError("Macro name is required");
      return;
    }
    if (macros[name]) {
      onError(`Macro "${name}" already exists`);
      return;
    }
    const result = convertLegendInput(newGlyph);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    onAdd(name, { glyph: result.glyph, label: "", steps: "" });
    setNewName("");
    setNewGlyph("");
  };

  return (
    <div>
      <span style={label}>Macros</span>
      {Object.entries(macros).map(([name, def]) => (
        <MacroRow key={name} name={name} def={def} onUpdate={onUpdate} onDelete={onDelete} onError={onError} />
      ))}
      <label style={label}>
        New macro name
        <input
          aria-label="New macro name"
          style={field}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
      </label>
      <label style={label}>
        New macro glyph
        <input
          aria-label="New macro glyph"
          style={field}
          value={newGlyph}
          onChange={(e) => setNewGlyph(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="km-btn"
        onClick={addMacro}
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
        Add macro
      </button>
    </div>
  );
}
