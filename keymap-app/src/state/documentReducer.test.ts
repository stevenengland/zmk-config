import {
  createInitialHistoryState,
  createInitialState,
  documentHistoryReducer,
  documentReducer,
} from "./documentReducer";
import { SCHEMA_VERSION, serialize } from "../model/schema";

describe("documentReducer", () => {
  it("boots with a single empty default layer that is active", () => {
    const state = createInitialState();

    expect(state.document.layers).toHaveLength(1);
    expect(state.document.layers[0].keys).toEqual({});
    expect(state.activeIndex).toBe(0);
  });

  it("replaces the whole document on load and resets selection to the first layer", () => {
    const dirty = documentReducer(
      documentReducer(createInitialState(), { type: "add", name: "Symbols", color: "#d4bbff" }),
      { type: "select-key", keyId: "L-r0-c0" },
    );

    const loaded = documentReducer(dirty, {
      type: "load",
      document: {
        schemaVersion: SCHEMA_VERSION,
        layers: [{ name: "Imported", color: "#fec931", keys: { "L-r0-c0": { primary: "A" } } }],
      },
    });

    expect(loaded.document.layers).toHaveLength(1);
    expect(loaded.document.layers[0].name).toBe("Imported");
    expect(loaded.activeIndex).toBe(0);
    expect(loaded.selectedKeyId).toBeNull();
  });

  it("adds a named+colored layer and switches to it", () => {
    const state = documentReducer(createInitialState(), {
      type: "add",
      name: "Symbols",
      color: "#d4bbff",
    });

    expect(state.document.layers).toHaveLength(2);
    expect(state.document.layers[1]).toMatchObject({ name: "Symbols", color: "#d4bbff", keys: {} });
    expect(state.activeIndex).toBe(1);
  });

  it("renames a layer without touching others", () => {
    const state = documentReducer(createInitialState(), { type: "rename", index: 0, name: "Base'" });

    expect(state.document.layers[0].name).toBe("Base'");
  });

  it("rewrites every hold.layer reference when the target layer is renamed", () => {
    const withNav = documentReducer(
      documentReducer(createInitialState(), { type: "add", name: "Nav", color: "#fec931" }),
      { type: "select", index: 0 },
    );
    const withHold = documentReducer(withNav, {
      type: "set-hold",
      keyId: "L-r4-c4",
      hold: { layer: "Nav" },
    });

    const state = documentReducer(withHold, { type: "rename", index: 1, name: "Navigation" });

    expect(state.document.layers[0].keys["L-r4-c4"].hold).toEqual({ layer: "Navigation" });
  });

  it("leaves unrelated hold.layer references untouched when a different layer is renamed", () => {
    const withNav = documentReducer(
      documentReducer(createInitialState(), { type: "add", name: "Nav", color: "#fec931" }),
      { type: "select", index: 0 },
    );
    const withHold = documentReducer(withNav, {
      type: "set-hold",
      keyId: "L-r4-c4",
      hold: { layer: "Nav" },
    });

    const state = documentReducer(withHold, { type: "rename", index: 0, name: "Base'" });

    expect(state.document.layers[0].keys["L-r4-c4"].hold).toEqual({ layer: "Nav" });
  });

  it("clears every hold binding referencing a deleted layer, dropping keys left with no other content", () => {
    const withNav = documentReducer(
      documentReducer(createInitialState(), { type: "add", name: "Nav", color: "#fec931" }),
      { type: "select", index: 0 },
    );
    const withHold = documentReducer(withNav, {
      type: "set-hold",
      keyId: "L-r4-c4",
      hold: { layer: "Nav" },
    });

    const state = documentReducer(withHold, { type: "delete", index: 1 });

    expect(state.document.layers[0].keys["L-r4-c4"]).toBeUndefined();
  });

  it("clears a hold.layer reference on delete but keeps the key's other legend content", () => {
    const withNav = documentReducer(
      documentReducer(createInitialState(), { type: "add", name: "Nav", color: "#fec931" }),
      { type: "select", index: 0 },
    );
    const withPrimary = documentReducer(withNav, {
      type: "set-slot",
      keyId: "L-r4-c4",
      slot: "primary",
      value: "␣",
    });
    const withHold = documentReducer(withPrimary, {
      type: "set-hold",
      keyId: "L-r4-c4",
      hold: { layer: "Nav" },
    });

    const state = documentReducer(withHold, { type: "delete", index: 1 });

    expect(state.document.layers[0].keys["L-r4-c4"]).toEqual({ primary: "␣" });
  });

  it("recolors a layer", () => {
    const state = documentReducer(createInitialState(), { type: "recolor", index: 0, color: "#ffeac0" });

    expect(state.document.layers[0].color).toBe("#ffeac0");
  });

  it("selects a layer as active", () => {
    const start = documentReducer(createInitialState(), { type: "add", name: "L2", color: "#fff" });

    const state = documentReducer(start, { type: "select", index: 0 });

    expect(state.activeIndex).toBe(0);
  });

  it("deletes a layer and clamps the active index", () => {
    const two = documentReducer(createInitialState(), { type: "add", name: "L2", color: "#fff" });

    const state = documentReducer(two, { type: "delete", index: 1 });

    expect(state.document.layers).toHaveLength(1);
    expect(state.activeIndex).toBe(0);
  });

  it("refuses to delete the last remaining layer", () => {
    const start = createInitialState();

    const state = documentReducer(start, { type: "delete", index: 0 });

    expect(state).toBe(start);
  });

  it("leaves state unchanged when renaming a layer at an out-of-range index", () => {
    const start = createInitialState();

    const state = documentReducer(start, { type: "rename", index: 5, name: "Ghost" });

    expect(state).toBe(start);
  });

  it("leaves state unchanged when deleting a layer at an out-of-range index", () => {
    const two = documentReducer(createInitialState(), { type: "add", name: "L2", color: "#fff" });

    const state = documentReducer(two, { type: "delete", index: 5 });

    expect(state).toBe(two);
  });

  it("treats the previous state as immutable", () => {
    const start = createInitialState();

    documentReducer(start, { type: "add", name: "L2", color: "#fff" });

    expect(start.document.layers).toHaveLength(1);
  });

  it("boots with no key selected", () => {
    expect(createInitialState().selectedKeyId).toBeNull();
  });

  it("records the selected key", () => {
    const state = documentReducer(createInitialState(), { type: "select-key", keyId: "L-r0-c0" });

    expect(state.selectedKeyId).toBe("L-r0-c0");
  });

  it("clears the selection", () => {
    const selected = documentReducer(createInitialState(), { type: "select-key", keyId: "L-enc" });

    const state = documentReducer(selected, { type: "select-key", keyId: null });

    expect(state.selectedKeyId).toBeNull();
  });

  it("boots in edit view mode", () => {
    expect(createInitialState().viewMode).toBe("edit");
  });

  it("toggles view mode via set-view", () => {
    const overview = documentReducer(createInitialState(), { type: "set-view", mode: "overview" });
    expect(overview.viewMode).toBe("overview");

    const edit = documentReducer(overview, { type: "set-view", mode: "edit" });
    expect(edit.viewMode).toBe("edit");
  });

  it("resets view mode to edit on load", () => {
    const overview = documentReducer(createInitialState(), { type: "set-view", mode: "overview" });

    const loaded = documentReducer(overview, {
      type: "load",
      document: { schemaVersion: SCHEMA_VERSION, layers: [{ name: "Imported", color: "#fec931", keys: {} }] },
    });

    expect(loaded.viewMode).toBe("edit");
  });

  it("sets a legend slot on the active layer's key", () => {
    const state = documentReducer(createInitialState(), {
      type: "set-slot",
      keyId: "L-r0-c0",
      slot: "primary",
      value: "A",
    });

    expect(state.document.layers[0].keys["L-r0-c0"]).toEqual({ primary: "A" });
  });

  it("sets a per-key primary color", () => {
    const withPrimary = documentReducer(createInitialState(), {
      type: "set-slot",
      keyId: "L-r0-c0",
      slot: "primary",
      value: "A",
    });

    const state = documentReducer(withPrimary, {
      type: "set-key-color",
      keyId: "L-r0-c0",
      color: "#fec931",
    });

    expect(state.document.layers[0].keys["L-r0-c0"]).toEqual({ primary: "A", color: "#fec931" });
  });

  it("removes a slot when cleared and drops the key once fully empty", () => {
    const withSlot = documentReducer(createInitialState(), {
      type: "set-slot",
      keyId: "L-r0-c0",
      slot: "primary",
      value: "A",
    });

    const state = documentReducer(withSlot, {
      type: "set-slot",
      keyId: "L-r0-c0",
      slot: "primary",
      value: "",
    });

    expect(state.document.layers[0].keys["L-r0-c0"]).toBeUndefined();
  });

  it("omits a cleared slot from the serialized document while keeping siblings", () => {
    let state = documentReducer(createInitialState(), {
      type: "set-slot",
      keyId: "L-r0-c0",
      slot: "primary",
      value: "A",
    });
    state = documentReducer(state, { type: "set-slot", keyId: "L-r0-c0", slot: "shifted", value: "!" });

    state = documentReducer(state, { type: "set-slot", keyId: "L-r0-c0", slot: "primary", value: "" });

    expect(state.document.layers[0].keys["L-r0-c0"]).toEqual({ shifted: "!" });
    const json = JSON.parse(serialize(state.document));
    expect(json.layers[0].keys["L-r0-c0"]).toEqual({ shifted: "!" });
  });

  it("sets a hold glyph with its shifted variant on the active layer's key", () => {
    const state = documentReducer(createInitialState(), {
      type: "set-hold",
      keyId: "L-r2-c1",
      hold: { glyph: "ä", shifted: "Ä" },
    });

    expect(state.document.layers[0].keys["L-r2-c1"]).toEqual({ hold: { glyph: "ä", shifted: "Ä" } });
  });

  it("does not drop a key that carries only a hold glyph and no legend text", () => {
    const state = documentReducer(createInitialState(), {
      type: "set-hold",
      keyId: "L-r2-c1",
      hold: { glyph: "ä" },
    });

    expect(state.document.layers[0].keys["L-r2-c1"]).toBeDefined();
  });

  it("clears the hold binding and drops the key once fully empty", () => {
    const withHold = documentReducer(createInitialState(), {
      type: "set-hold",
      keyId: "L-r2-c1",
      hold: { glyph: "ä", shifted: "Ä" },
    });

    const state = documentReducer(withHold, { type: "set-hold", keyId: "L-r2-c1", hold: undefined });

    expect(state.document.layers[0].keys["L-r2-c1"]).toBeUndefined();
  });

  it("clearing the hold binding removes it from the serialized document while keeping siblings", () => {
    let state = documentReducer(createInitialState(), {
      type: "set-slot",
      keyId: "L-r2-c1",
      slot: "primary",
      value: "a",
    });
    state = documentReducer(state, {
      type: "set-hold",
      keyId: "L-r2-c1",
      hold: { glyph: "ä", shifted: "Ä" },
    });

    state = documentReducer(state, { type: "set-hold", keyId: "L-r2-c1", hold: undefined });

    expect(state.document.layers[0].keys["L-r2-c1"]).toEqual({ primary: "a" });
    const json = JSON.parse(serialize(state.document));
    expect(json.layers[0].keys["L-r2-c1"]).toEqual({ primary: "a" });
  });

  it("appends a default tap-dance row on the active layer's key", () => {
    const state = documentReducer(createInitialState(), { type: "add-tap", keyId: "L-r2-c1" });

    expect(state.document.layers[0].keys["L-r2-c1"].taps).toEqual([{ count: 2, glyph: "" }]);
  });

  it("appends a further tap-dance row after an existing one", () => {
    const withOne = documentReducer(createInitialState(), { type: "add-tap", keyId: "L-r2-c1" });

    const state = documentReducer(withOne, { type: "add-tap", keyId: "L-r2-c1" });

    expect(state.document.layers[0].keys["L-r2-c1"].taps).toEqual([
      { count: 2, glyph: "" },
      { count: 2, glyph: "" },
    ]);
  });

  it("updates a tap-dance row by index", () => {
    const withOne = documentReducer(createInitialState(), { type: "add-tap", keyId: "L-r2-c1" });

    const state = documentReducer(withOne, {
      type: "update-tap",
      keyId: "L-r2-c1",
      index: 0,
      tap: { count: 3, glyph: "⇧", toggle: true },
    });

    expect(state.document.layers[0].keys["L-r2-c1"].taps).toEqual([
      { count: 3, glyph: "⇧", toggle: true },
    ]);
  });

  it("deletes a tap-dance row by index, keeping the key's other legend content", () => {
    let state = documentReducer(createInitialState(), {
      type: "set-slot",
      keyId: "L-r2-c1",
      slot: "primary",
      value: "⇧",
    });
    state = documentReducer(state, { type: "add-tap", keyId: "L-r2-c1" });
    state = documentReducer(state, { type: "add-tap", keyId: "L-r2-c1" });
    state = documentReducer(state, {
      type: "update-tap",
      keyId: "L-r2-c1",
      index: 0,
      tap: { count: 2, glyph: "⇪" },
    });

    state = documentReducer(state, { type: "delete-tap", keyId: "L-r2-c1", index: 1 });

    expect(state.document.layers[0].keys["L-r2-c1"]).toEqual({
      primary: "⇧",
      taps: [{ count: 2, glyph: "⇪" }],
    });
  });

  it("prunes the taps field and drops the key once the last tap-dance row is removed", () => {
    const withOne = documentReducer(createInitialState(), { type: "add-tap", keyId: "L-r2-c1" });

    const state = documentReducer(withOne, { type: "delete-tap", keyId: "L-r2-c1", index: 0 });

    expect(state.document.layers[0].keys["L-r2-c1"]).toBeUndefined();
    const json = JSON.parse(serialize(state.document));
    expect(json.layers[0].keys["L-r2-c1"]).toBeUndefined();
  });

  it("does not persist a legend that only carries a color with no glyph slots", () => {
    const state = documentReducer(createInitialState(), {
      type: "set-key-color",
      keyId: "L-r0-c0",
      color: "#fec931",
    });

    expect(state.document.layers[0].keys["L-r0-c0"]).toBeUndefined();
  });

  it("marks a key homing on toggle, board-wide", () => {
    const state = documentReducer(createInitialState(), { type: "toggle-homing", keyId: "L-r2-c4" });

    expect(state.document.board).toEqual({ homing: ["L-r2-c4"] });
  });

  it("unmarks a homing key on a second toggle and prunes the empty board section", () => {
    const marked = documentReducer(createInitialState(), { type: "toggle-homing", keyId: "L-r2-c4" });

    const state = documentReducer(marked, { type: "toggle-homing", keyId: "L-r2-c4" });

    expect(state.document.board).toBeUndefined();
    expect(JSON.parse(serialize(state.document))).not.toHaveProperty("board");
  });

  it("keeps other homing keys when unmarking one of several", () => {
    const twoMarked = documentReducer(
      documentReducer(createInitialState(), { type: "toggle-homing", keyId: "L-r2-c4" }),
      { type: "toggle-homing", keyId: "R-r2-c1" },
    );

    const state = documentReducer(twoMarked, { type: "toggle-homing", keyId: "L-r2-c4" });

    expect(state.document.board).toEqual({ homing: ["R-r2-c1"] });
  });

  it("edits legends only on the active layer", () => {
    const two = documentReducer(createInitialState(), { type: "add", name: "L2", color: "#fff" });

    const state = documentReducer(two, {
      type: "set-slot",
      keyId: "L-r0-c0",
      slot: "shifted",
      value: "!",
    });

    expect(state.document.layers[1].keys["L-r0-c0"]).toEqual({ shifted: "!" });
    expect(state.document.layers[0].keys["L-r0-c0"]).toBeUndefined();
  });

  it("adds a macro to the document-level registry", () => {
    const state = documentReducer(createInitialState(), {
      type: "add-macro",
      name: "copy",
      def: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" },
    });

    expect(state.document.macros).toEqual({
      copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" },
    });
  });

  it("assigns a macro reference alongside a key's hold binding — a key can tap a macro and hold a layer", () => {
    const withHold = documentReducer(createInitialState(), {
      type: "set-hold",
      keyId: "R-r2-c1",
      hold: { glyph: "ä" },
    });

    const state = documentReducer(withHold, { type: "set-macro", keyId: "R-r2-c1", macro: "copy" });

    expect(state.document.layers[0].keys["R-r2-c1"]).toEqual({ hold: { glyph: "ä" }, macro: "copy" });
  });

  it("setting a hold binding leaves a key's macro reference intact", () => {
    const withMacro = documentReducer(createInitialState(), {
      type: "set-macro",
      keyId: "R-r2-c1",
      macro: "copy",
    });

    const state = documentReducer(withMacro, {
      type: "set-hold",
      keyId: "R-r2-c1",
      hold: { glyph: "ä" },
    });

    expect(state.document.layers[0].keys["R-r2-c1"]).toEqual({ macro: "copy", hold: { glyph: "ä" } });
  });

  it("editing a macro's glyph and label updates every key referencing it, across layers", () => {
    let state = documentReducer(createInitialState(), {
      type: "add-macro",
      name: "copy",
      def: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" },
    });
    state = documentReducer(state, { type: "add", name: "Mouse", color: "#fec931" });
    state = documentReducer(state, { type: "set-macro", keyId: "R-r2-c1", macro: "copy" });
    state = documentReducer(state, { type: "select", index: 0 });
    state = documentReducer(state, { type: "set-macro", keyId: "L-r0-c0", macro: "copy" });

    state = documentReducer(state, {
      type: "update-macro",
      name: "copy",
      def: { glyph: "⌃⇧C", label: "Copy (renamed)", steps: "hold Ctrl+Shift · tap C" },
    });

    expect(state.document.macros).toEqual({
      copy: { glyph: "⌃⇧C", label: "Copy (renamed)", steps: "hold Ctrl+Shift · tap C" },
    });
    // both referencing keys resolve the updated entry via the same by-name lookup
    expect(state.document.layers[0].keys["L-r0-c0"]).toEqual({ macro: "copy" });
    expect(state.document.layers[1].keys["R-r2-c1"]).toEqual({ macro: "copy" });
  });

  it("deleting a macro removes it from the registry and clears every key reference to it, dropping keys left with no other content", () => {
    let state = documentReducer(createInitialState(), {
      type: "add-macro",
      name: "copy",
      def: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" },
    });
    state = documentReducer(state, { type: "add", name: "Mouse", color: "#fec931" });
    state = documentReducer(state, { type: "set-macro", keyId: "R-r2-c1", macro: "copy" });
    state = documentReducer(state, { type: "select", index: 0 });
    state = documentReducer(state, {
      type: "set-slot",
      keyId: "L-r0-c0",
      slot: "primary",
      value: "a",
    });
    state = documentReducer(state, { type: "set-macro", keyId: "L-r0-c0", macro: "copy" });

    state = documentReducer(state, { type: "delete-macro", name: "copy" });

    expect(state.document.macros).toBeUndefined();
    // key with other content keeps its remaining legend, macro ref dropped
    expect(state.document.layers[0].keys["L-r0-c0"]).toEqual({ primary: "a" });
    // key with no other content is dropped entirely — no dangling reference
    expect(state.document.layers[1].keys["R-r2-c1"]).toBeUndefined();
  });

  it("prunes an empty macro registry from the serialized document once the last entry is deleted", () => {
    let state = documentReducer(createInitialState(), {
      type: "add-macro",
      name: "copy",
      def: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" },
    });

    state = documentReducer(state, { type: "delete-macro", name: "copy" });

    expect(JSON.parse(serialize(state.document))).not.toHaveProperty("macros");
  });

  it("keeps a macro registry entry that no key references", () => {
    const state = documentReducer(createInitialState(), {
      type: "add-macro",
      name: "copy",
      def: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" },
    });

    expect(JSON.parse(serialize(state.document)).macros).toEqual({
      copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" },
    });
  });
});

describe("documentHistoryReducer", () => {
  it("undoes a legend edit and redoes it back", () => {
    const withEdit = documentHistoryReducer(createInitialHistoryState(), {
      type: "set-slot",
      keyId: "L-r0-c0",
      slot: "primary",
      value: "A",
    });

    const undone = documentHistoryReducer(withEdit, { type: "undo" });
    expect(undone.present.document.layers[0].keys["L-r0-c0"]).toBeUndefined();

    const redone = documentHistoryReducer(undone, { type: "redo" });
    expect(redone.present.document.layers[0].keys["L-r0-c0"]).toEqual({ primary: "A" });
  });

  it("undoes a layer operation (add)", () => {
    const withLayer = documentHistoryReducer(createInitialHistoryState(), {
      type: "add",
      name: "Symbols",
      color: "#d4bbff",
    });

    const undone = documentHistoryReducer(withLayer, { type: "undo" });

    expect(undone.present.document.layers).toHaveLength(1);
  });

  it("clears the redo stack once a new edit follows an undo", () => {
    const renamed = documentHistoryReducer(createInitialHistoryState(), {
      type: "rename",
      index: 0,
      name: "First",
    });
    const undone = documentHistoryReducer(renamed, { type: "undo" });

    const renamedAgain = documentHistoryReducer(undone, {
      type: "rename",
      index: 0,
      name: "Second",
    });

    expect(renamedAgain.future).toHaveLength(0);
    expect(documentHistoryReducer(renamedAgain, { type: "redo" })).toBe(renamedAgain);
  });

  it("resets history when a file is loaded", () => {
    const renamed = documentHistoryReducer(createInitialHistoryState(), {
      type: "rename",
      index: 0,
      name: "First",
    });

    const loaded = documentHistoryReducer(renamed, {
      type: "load",
      document: { schemaVersion: SCHEMA_VERSION, layers: [{ name: "Imported", color: "#fec931", keys: {} }] },
    });

    expect(loaded.past).toHaveLength(0);
    expect(loaded.future).toHaveLength(0);
  });

  it("does not track key selection as undoable history", () => {
    const selected = documentHistoryReducer(createInitialHistoryState(), {
      type: "select-key",
      keyId: "L-r0-c0",
    });

    expect(selected.past).toHaveLength(0);
  });

  it("does not track a view-mode switch as undoable history", () => {
    const overview = documentHistoryReducer(createInitialHistoryState(), {
      type: "set-view",
      mode: "overview",
    });

    expect(overview.past).toHaveLength(0);
  });

  it("leaves the exported document byte-identical across a view-mode switch", () => {
    const before = documentReducer(createInitialState(), {
      type: "set-slot",
      keyId: "L-r0-c0",
      slot: "primary",
      value: "A",
    });
    const beforeJson = serialize(before.document);

    const after = documentReducer(before, { type: "set-view", mode: "overview" });

    expect(serialize(after.document)).toBe(beforeJson);
  });

  it("does not record undo history when deleting the last remaining layer (no-op)", () => {
    const state = documentHistoryReducer(createInitialHistoryState(), { type: "delete", index: 0 });

    expect(state.past).toHaveLength(0);
  });
});
