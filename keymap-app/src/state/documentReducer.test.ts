import { createInitialState, documentReducer } from "./documentReducer";
import { serialize } from "../model/schema";

describe("documentReducer", () => {
  it("boots with a single empty default layer that is active", () => {
    const state = createInitialState();

    expect(state.document.layers).toHaveLength(1);
    expect(state.document.layers[0].keys).toEqual({});
    expect(state.activeIndex).toBe(0);
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
});
