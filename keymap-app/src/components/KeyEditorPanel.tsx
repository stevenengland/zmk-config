import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { HoldBinding, KeyLegend, MacroRegistry, TapBinding } from "../model/schema";
import type { LegendSlot } from "../state/documentReducer";
import { convertLegendInput } from "../model/codepoint";
import { boardGeometry, describeElementId } from "../model/geometry";
import { BindingEditor } from "./BindingEditor";
import { FieldError } from "./FieldError";
import { useFieldFeedback } from "./useFieldFeedback";
import { SymbolPicker } from "./SymbolPicker";
import { TapDanceList } from "./TapDanceList";

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
  /** Board-wide: whether this key is a homing key (renders on every layer). */
  homing: boolean;
  onToggleHoming: () => void;
  onSetHold: (hold: HoldBinding | undefined) => void;
  onSetMacro: (name: string | undefined) => void;
  onAddTap: () => void;
  onUpdateTap: (index: number, tap: TapBinding) => void;
  onDeleteTap: (index: number) => void;
  /** Layer count, surfaced in the empty state so the idle panel still orients. */
  layerCount?: number;
  /** Every layer's name, forwarded to the binding editor's Layer-mode picker. */
  layerNames?: readonly string[];
  /** Document-level macro registry forwarded to the per-key Macro picker. */
  macros: MacroRegistry;
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
type EditorTab = "legends" | "behaviors" | "properties";

const EDITOR_TABS: ReadonlyArray<{ id: EditorTab; label: string }> = [
  { id: "legends", label: "Legends" },
  { id: "behaviors", label: "Behaviors" },
  { id: "properties", label: "Properties" },
];

function fieldsFromLegend(legend: KeyLegend): Fields {
  return {
    primary: legend.primary ?? "",
    shifted: legend.shifted ?? "",
    altgr: legend.altgr ?? "",
  };
}

/**
 * Side panel bound to the selected key. Each slot field commits on blur or
 * Enter: `U+XXXX` input converts to its glyph, an invalid codepoint stays in the
 * field with its explanation beside it and leaves the slot untouched, and an
 * empty field clears the slot. The color control recolors the key's primary legend.
 */
export function KeyEditorPanel({
  keyId,
  activeIndex,
  legend,
  onSetSlot,
  onSetColor,
  homing,
  onToggleHoming,
  onSetHold,
  onSetMacro,
  onAddTap,
  onUpdateTap,
  onDeleteTap,
  layerCount = 1,
  layerNames = [],
  macros,
}: KeyEditorPanelProps) {
  const [fields, setFields] = useState<Fields>(() => fieldsFromLegend(legend));
  const [activeTab, setActiveTab] = useState<EditorTab>("legends");
  const tabRefs = useRef<Partial<Record<EditorTab, HTMLButtonElement>>>({});
  // The slot a picked symbol lands in; follows field focus, primary by default.
  const [activeSlot, setActiveSlot] = useState<LegendSlot>("primary");
  const feedback = useFieldFeedback<LegendSlot>();
  const primaryInputRef = useRef<HTMLInputElement | null>(null);
  // Mirrors the latest legend without being a focus-effect dependency, so
  // focus-on-select re-fires only on an actual key change, never on a
  // same-key legend update.
  const legendRef = useRef(legend);
  legendRef.current = legend;
  const feedbackRef = useRef(feedback);
  feedbackRef.current = feedback;
  // The key-and-layer pair the fields are currently bound to; a change means a
  // fresh set of drafts, the same pair the focus effect below treats as a move.
  const boundToRef = useRef(`${keyId}:${activeIndex}`);

  // Re-bind the fields whenever the selected key or its committed legend changes.
  // A slot holding an invalid draft keeps it, because the correction happens at
  // that field: a sibling slot committing must not discard it.
  useEffect(() => {
    const boundTo = `${keyId}:${activeIndex}`;
    if (boundToRef.current !== boundTo) {
      boundToRef.current = boundTo;
      feedbackRef.current.reset();
      setFields(fieldsFromLegend(legend));
      return;
    }
    setFields((prev) => {
      const bound = fieldsFromLegend(legend);
      for (const { slot } of SLOTS) {
        if (feedbackRef.current.error(slot)) bound[slot] = prev[slot];
      }
      return bound;
    });
  }, [keyId, activeIndex, legend]);

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

  useEffect(() => {
    if (keyId !== null) setActiveTab("legends");
  }, [keyId, activeIndex]);

  const commit = (slot: LegendSlot, raw: string) => {
    const result = convertLegendInput(raw);
    if (!result.ok) {
      feedback.report(slot, result.error);
      setFields((prev) => ({ ...prev, [slot]: raw }));
      return;
    }
    feedback.clear(slot);
    setFields((prev) => ({ ...prev, [slot]: result.glyph }));
    onSetSlot(slot, result.glyph);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: EditorTab) => {
    const currentIndex = EDITOR_TABS.findIndex((tab) => tab.id === currentTab);
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % EDITOR_TABS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + EDITOR_TABS.length) % EDITOR_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = EDITOR_TABS.length - 1;
    }
    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextTab = EDITOR_TABS[nextIndex].id;
    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <aside style={panel} aria-label="Key editor">
      {keyId === null ? (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>Sofle Choc</h2>
          <p
            style={{
              margin: "0 0 16px",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              letterSpacing: "0.04em",
              color: ON_SURFACE_VARIANT,
            }}
          >
            {boardGeometry.length} keys · {layerCount} layer{layerCount === 1 ? "" : "s"}
          </p>
          <p style={{ color: ON_SURFACE_VARIANT, fontSize: 14 }}>Select a key to edit its legends.</p>
        </>
      ) : (
        <>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 2px" }}>
            {legend.primary ? `“${legend.primary}”` : "Empty key"}
          </h2>
          {/* Raw id kept visible (not the headline) — this audience cross-references
              it against firmware/matrix maps, per docs/design/stitch.md's brief. */}
          <p
            style={{
              margin: "0 0 16px",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 11,
              letterSpacing: "0.04em",
              color: ON_SURFACE_VARIANT,
            }}
          >
            {describeElementId(keyId)} · {keyId}
          </p>

          <div role="tablist" aria-label="Key editor tasks" style={{ display: "flex", gap: 4, marginBottom: 16 }}>
            {EDITOR_TABS.map((tab) => (
              <button
                key={tab.id}
                ref={(element) => {
                  tabRefs.current[tab.id] = element ?? undefined;
                }}
                id={`key-editor-${tab.id}-tab`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`key-editor-${tab.id}-panel`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                className="km-btn"
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "legends" && (
            <div role="tabpanel" id="key-editor-legends-panel" aria-labelledby="key-editor-legends-tab">
              {SLOTS.map(({ slot, label: text }) => (
                <div key={slot}>
                  <label style={label}>
                    {text}
                    <input
                      ref={slot === "primary" ? primaryInputRef : undefined}
                      aria-label={`${text} legend`}
                      {...feedback.fieldProps(slot, field)}
                      value={fields[slot]}
                      onFocus={() => setActiveSlot(slot)}
                      onChange={(e) => setFields((prev) => ({ ...prev, [slot]: e.target.value }))}
                      onBlur={(e) => commit(slot, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commit(slot, e.currentTarget.value);
                      }}
                    />
                  </label>
                  <FieldError feedback={feedback} name={slot} />
                </div>
              ))}

              <SymbolPicker onInsert={(glyph) => commit(activeSlot, glyph)} />
            </div>
          )}

          {activeTab === "behaviors" && (
            <div role="tabpanel" id="key-editor-behaviors-panel" aria-labelledby="key-editor-behaviors-tab">
              <span style={label}>On hold</span>
              <BindingEditor
                keyId={keyId}
                activeIndex={activeIndex}
                hold={legend.hold}
                onSetHold={onSetHold}
                layerNames={layerNames}
              />

              <label style={label}>
                Macro
                <select
                  aria-label="Macro"
                  value={legend.macro ?? ""}
                  onChange={(e) => onSetMacro(e.target.value || undefined)}
                  style={field}
                >
                  <option value="">(none)</option>
                  {Object.keys(macros).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <TapDanceList
                editorId={`${keyId}:${activeIndex}`}
                taps={legend.taps ?? []}
                onAdd={onAddTap}
                onUpdate={onUpdateTap}
                onDelete={onDeleteTap}
              />
            </div>
          )}

          {activeTab === "properties" && (
            <div role="tabpanel" id="key-editor-properties-panel" aria-labelledby="key-editor-properties-tab">
              <label style={{ ...label, display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  aria-label="Homing key"
                  checked={homing}
                  onChange={onToggleHoming}
                />
                Homing key
              </label>

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
            </div>
          )}
        </>
      )}
    </aside>
  );
}
