import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { KeymapDocument } from "../model/schema";
import { Toolbar } from "./Toolbar";

vi.mock("../io/persistence", () => ({
  openDocument: vi.fn(),
  saveDocument: vi.fn(),
}));

import { openDocument, saveDocument } from "../io/persistence";

const DOC: KeymapDocument = { schemaVersion: 1, layers: [{ name: "Base", color: "#00e5ff", keys: {} }] };
const LOADED: KeymapDocument = {
  schemaVersion: 1,
  layers: [{ name: "Imported", color: "#fec931", keys: {} }],
};

function renderToolbar(overrides: Partial<{ canUndo: boolean; canRedo: boolean }> = {}) {
  const onLoad = vi.fn();
  const onStatus = vi.fn();
  const onUndo = vi.fn();
  const onRedo = vi.fn();
  render(
    <Toolbar
      document={DOC}
      onLoad={onLoad}
      onStatus={onStatus}
      onUndo={onUndo}
      onRedo={onRedo}
      canUndo={overrides.canUndo ?? false}
      canRedo={overrides.canRedo ?? false}
    />,
  );
  return { onLoad, onStatus, onUndo, onRedo };
}

afterEach(() => vi.clearAllMocks());

it("loads the opened document and reports success", async () => {
  vi.mocked(openDocument).mockResolvedValue({ document: LOADED, handle: null });
  const { onLoad, onStatus } = renderToolbar();

  fireEvent.click(screen.getByRole("button", { name: /open/i }));

  await waitFor(() => expect(onLoad).toHaveBeenCalledWith(LOADED));
  expect(onStatus).toHaveBeenLastCalledWith({ text: "Loaded keymap", tone: "info" });
});

it("shows a status-bar error and leaves the document untouched when open fails", async () => {
  vi.mocked(openDocument).mockRejectedValue(new Error("Unexpected token"));
  const { onLoad, onStatus } = renderToolbar();

  fireEvent.click(screen.getByRole("button", { name: /open/i }));

  await waitFor(() =>
    expect(onStatus).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "error", text: expect.stringMatching(/could not open/i) }),
    ),
  );
  expect(onLoad).not.toHaveBeenCalled();
});

it("saves the current document and reports success", async () => {
  vi.mocked(saveDocument).mockResolvedValue(null);
  const { onStatus } = renderToolbar();

  fireEvent.click(screen.getByRole("button", { name: /save/i }));

  await waitFor(() => expect(saveDocument).toHaveBeenCalledWith(DOC, null));
  expect(onStatus).toHaveBeenLastCalledWith({ text: "Saved keymap", tone: "info" });
});

it("disables undo and redo when their stacks are empty", () => {
  renderToolbar();

  expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
  expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
});

it("enables undo/redo per their flags and routes clicks to the handlers", () => {
  const { onUndo, onRedo } = renderToolbar({ canUndo: true, canRedo: true });

  const undoButton = screen.getByRole("button", { name: /undo/i });
  const redoButton = screen.getByRole("button", { name: /redo/i });
  expect(undoButton).toBeEnabled();
  expect(redoButton).toBeEnabled();

  fireEvent.click(undoButton);
  fireEvent.click(redoButton);

  expect(onUndo).toHaveBeenCalledTimes(1);
  expect(onRedo).toHaveBeenCalledTimes(1);
});
