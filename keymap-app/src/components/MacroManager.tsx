import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { MacroDef, MacroRegistry } from "../model/schema";
import { convertLegendInput } from "../model/codepoint";
import { FieldError } from "./FieldError";
import { useFieldFeedback } from "./useFieldFeedback";

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
}

/** One registry entry: name is fixed at creation, glyph/label/steps commit on blur or Enter. */
function MacroRow({ name, def, onUpdate, onDelete }: MacroRowProps) {
  const [fields, setFields] = useState<MacroDef>(def);
  const feedback = useFieldFeedback<"glyph">();
  const feedbackRef = useRef(feedback);
  feedbackRef.current = feedback;

  // An invalid glyph draft survives a committed change to this entry's other
  // fields; the correction happens at the glyph field itself.
  useEffect(() => {
    setFields((prev) => (feedbackRef.current.error("glyph") ? { ...def, glyph: prev.glyph } : def));
  }, [name, def]);

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
}

/**
 * Document-level macro registry manager: name, glyph, label, and steps per
 * entry (PRD #28 decision anchor D3). Name is set once at creation and is
 * not itself editable — editing glyph/label/steps fans out to every
 * referencing key by the shared by-name lookup; deleting an entry is handled
 * by the caller's `onDelete`, which also clears every reference to it.
 */
export function MacroManager({ macros, onAdd, onUpdate, onDelete }: MacroManagerProps) {
  const [newName, setNewName] = useState("");
  const [newGlyph, setNewGlyph] = useState("");
  const feedback = useFieldFeedback<"new-name" | "new-glyph">();

  const addMacro = () => {
    const name = newName.trim();
    if (!name) {
      feedback.report("new-name", "Macro name is required");
      return;
    }
    if (macros[name]) {
      feedback.report("new-name", `Macro "${name}" already exists`);
      return;
    }
    feedback.clear("new-name");
    const result = convertLegendInput(newGlyph);
    if (!result.ok) {
      feedback.report("new-glyph", result.error);
      return;
    }
    feedback.clear("new-glyph");
    onAdd(name, { glyph: result.glyph, label: "", steps: "" });
    setNewName("");
    setNewGlyph("");
  };

  return (
    <div>
      <span style={label}>Macros</span>
      {Object.entries(macros).map(([name, def]) => (
        <MacroRow key={name} name={name} def={def} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
      <label style={label}>
        New macro name
        <input
          aria-label="New macro name"
          {...feedback.fieldProps("new-name", field)}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
      </label>
      <FieldError feedback={feedback} name="new-name" />
      <label style={label}>
        New macro glyph
        <input
          aria-label="New macro glyph"
          {...feedback.fieldProps("new-glyph", field)}
          value={newGlyph}
          onChange={(e) => setNewGlyph(e.target.value)}
        />
      </label>
      <FieldError feedback={feedback} name="new-glyph" />
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
