import { createInitialState, documentReducer } from "./documentReducer";

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
});
