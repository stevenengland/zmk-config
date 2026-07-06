// Generic snapshot-based undo/redo wrapper for any reducer. Keeps three
// stacks of full state snapshots rather than diffing — simplest correct
// approach for a document this size.

export interface HistoryState<S> {
  past: S[];
  present: S;
  future: S[];
}

/** How a wrapped action affects the undo/redo stacks. */
export type HistoryDirective =
  | "track" // push present onto past, clear future
  | "reset" // clear both stacks (e.g. loading a new document)
  | "transparent"; // update present without touching either stack

// Caps the past stack so a very long editing session can't grow snapshot
// memory without bound; a keymap document is small, so this is generous.
const MAX_PAST = 100;

export function createHistory<S>(present: S): HistoryState<S> {
  return { past: [], present, future: [] };
}

export function canUndo<S>(state: HistoryState<S>): boolean {
  return state.past.length > 0;
}

export function canRedo<S>(state: HistoryState<S>): boolean {
  return state.future.length > 0;
}

export function undo<S>(state: HistoryState<S>): HistoryState<S> {
  if (state.past.length === 0) return state;
  const present = state.past[state.past.length - 1];
  return {
    past: state.past.slice(0, -1),
    present,
    future: [state.present, ...state.future],
  };
}

export function redo<S>(state: HistoryState<S>): HistoryState<S> {
  if (state.future.length === 0) return state;
  const [present, ...rest] = state.future;
  return {
    past: [...state.past, state.present],
    present,
    future: rest,
  };
}

/** Apply `action` via `reducer`, routing the result per `directive`. */
export function apply<S, A>(
  state: HistoryState<S>,
  action: A,
  reducer: (state: S, action: A) => S,
  directive: HistoryDirective,
): HistoryState<S> {
  const present = reducer(state.present, action);
  switch (directive) {
    case "reset":
      return createHistory(present);
    case "transparent":
      return { ...state, present };
    case "track":
      // A reducer that returns its input unchanged (e.g. a refused delete)
      // made no edit — don't record a no-op undo step for it.
      if (present === state.present) return { ...state, present };
      return {
        past: [...state.past, state.present].slice(-MAX_PAST),
        present,
        future: [],
      };
  }
}
