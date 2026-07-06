import { apply, canRedo, canUndo, createHistory, redo, undo } from "./history";

type Counter = { value: number };

function increment(state: Counter): Counter {
  return { value: state.value + 1 };
}

describe("history", () => {
  it("boots with empty past/future and undo/redo disabled", () => {
    const state = createHistory<Counter>({ value: 0 });

    expect(canUndo(state)).toBe(false);
    expect(canRedo(state)).toBe(false);
  });

  it("tracks an action by pushing the prior present onto past", () => {
    const start = createHistory<Counter>({ value: 0 });

    const state = apply(start, undefined, increment, "track");

    expect(state.present).toEqual({ value: 1 });
    expect(state.past).toEqual([{ value: 0 }]);
    expect(canUndo(state)).toBe(true);
  });

  it("undoes to the previous snapshot and enables redo", () => {
    const tracked = apply(createHistory<Counter>({ value: 0 }), undefined, increment, "track");

    const state = undo(tracked);

    expect(state.present).toEqual({ value: 0 });
    expect(canUndo(state)).toBe(false);
    expect(canRedo(state)).toBe(true);
  });

  it("redoes back to the newer snapshot", () => {
    const tracked = apply(createHistory<Counter>({ value: 0 }), undefined, increment, "track");
    const undone = undo(tracked);

    const state = redo(undone);

    expect(state.present).toEqual({ value: 1 });
    expect(canUndo(state)).toBe(true);
    expect(canRedo(state)).toBe(false);
  });

  it("is a no-op undoing with an empty past", () => {
    const start = createHistory<Counter>({ value: 0 });

    expect(undo(start)).toBe(start);
  });

  it("is a no-op redoing with an empty future", () => {
    const start = createHistory<Counter>({ value: 0 });

    expect(redo(start)).toBe(start);
  });

  it("clears the redo stack when a new tracked action follows an undo", () => {
    const tracked = apply(createHistory<Counter>({ value: 0 }), undefined, increment, "track");
    const undone = undo(tracked);

    const state = apply(undone, undefined, increment, "track");

    expect(state.present).toEqual({ value: 1 });
    expect(canRedo(state)).toBe(false);
  });

  it("resets both stacks on a reset-directive action", () => {
    const tracked = apply(createHistory<Counter>({ value: 0 }), undefined, increment, "track");

    const state = apply(tracked, undefined, () => ({ value: 99 }), "reset");

    expect(state.present).toEqual({ value: 99 });
    expect(canUndo(state)).toBe(false);
    expect(canRedo(state)).toBe(false);
  });

  it("applies a transparent action without touching either stack", () => {
    const tracked = apply(createHistory<Counter>({ value: 0 }), undefined, increment, "track");

    const state = apply(tracked, undefined, increment, "transparent");

    expect(state.present).toEqual({ value: 2 });
    expect(state.past).toEqual([{ value: 0 }]);
    expect(canRedo(state)).toBe(false);
  });
});
