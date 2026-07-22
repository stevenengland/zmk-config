import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import { SCHEMA_VERSION, type KeymapDocument } from "../model/schema";
import { Toolbar } from "./Toolbar";

vi.mock("../io/persistence", () => ({
  openDocument: vi.fn(),
  saveDocument: vi.fn(),
}));
vi.mock("../io/export", () => ({
  exportLayerSvg: vi.fn(),
  exportAllLayersSvg: vi.fn(),
  exportJson: vi.fn(),
}));

import { openDocument, saveDocument } from "../io/persistence";
import { exportAllLayersSvg, exportJson, exportLayerSvg } from "../io/export";

const DOC: KeymapDocument = {
  schemaVersion: SCHEMA_VERSION,
  layers: [
    { name: "Base", color: "#00e5ff", keys: {} },
    { name: "Nav", color: "#fec931", keys: {} },
  ],
};
const LOADED: KeymapDocument = {
  schemaVersion: SCHEMA_VERSION,
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
      activeLayer={DOC.layers[0]}
      filename="keymap.json"
      isDirty={false}
      onLoad={onLoad}
      onSaved={vi.fn()}
      onStatus={onStatus}
      onUndo={onUndo}
      onRedo={onRedo}
      canUndo={overrides.canUndo ?? false}
      canRedo={overrides.canRedo ?? false}
      onManageMacros={vi.fn()}
    />,
  );
  return { onLoad, onStatus, onUndo, onRedo };
}

afterEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
});

it("loads the opened document and reports success", async () => {
  vi.mocked(openDocument).mockResolvedValue({ document: LOADED, handle: null, filename: "loaded.json" });
  const { onLoad, onStatus } = renderToolbar();

  fireEvent.click(screen.getByRole("button", { name: /open/i }));

  await waitFor(() => expect(onLoad).toHaveBeenCalledWith(LOADED, "loaded.json"));
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

it("exports the active layer as SVG and reports success", () => {
  const { onStatus } = renderToolbar();

  fireEvent.click(screen.getByRole("button", { name: "Export" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Export SVG" }));

  expect(exportLayerSvg).toHaveBeenCalledWith(DOC.layers[0], [], DOC.layers, {});
  expect(onStatus).toHaveBeenCalledWith(
    expect.objectContaining({ tone: "info" }),
  );
});

it("exports every layer as SVG and reports success", () => {
  const { onStatus } = renderToolbar();

  fireEvent.click(screen.getByRole("button", { name: "Export" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Export All SVG" }));

  expect(exportAllLayersSvg).toHaveBeenCalledWith(DOC.layers, [], {});
  expect(onStatus).toHaveBeenCalledWith(
    expect.objectContaining({ tone: "info" }),
  );
});

it("exports the document as JSON and reports success", () => {
  const { onStatus } = renderToolbar();

  fireEvent.click(screen.getByRole("button", { name: "Export" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Export JSON" }));

  expect(exportJson).toHaveBeenCalledWith(DOC);
  expect(onStatus).toHaveBeenCalledWith(
    expect.objectContaining({ tone: "info" }),
  );
});

it("desktop presents file identity and every global action", () => {
  // Given a dirty document with a known file identity
  render(
    <Toolbar
      document={DOC}
      activeLayer={DOC.layers[0]}
      filename="sofle.keymap.json"
      isDirty
      onLoad={vi.fn()}
      onSaved={vi.fn()}
      onStatus={vi.fn()}
      onUndo={vi.fn()}
      onRedo={vi.fn()}
      canUndo
      canRedo
      onManageMacros={vi.fn()}
    />,
  );

  // When the desktop toolbar is presented
  const toolbar = screen.getByRole("toolbar", { name: "Global controls" });

  // Then file state and prioritized global actions are available
  expect(toolbar).toHaveTextContent("sofle.keymap.json · Unsaved changes");
  for (const name of ["Open", "Save", "Macro library", "Export", "Undo", "Redo"]) {
    expect(screen.getByRole("button", { name })).toBeVisible();
  }
});

it("compact width keeps Save visible and moves lower-priority actions into More", () => {
  // Given the toolbar is rendered below the compact breakpoint
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  renderToolbar({ canUndo: true, canRedo: true });

  // When the user opens the compact overflow menu
  const toolbar = screen.getByRole("toolbar", { name: "Global controls" });
  fireEvent.click(within(toolbar).getByRole("button", { name: "More" }));

  // Then Save stays direct and every lower-priority action is available in one menu
  expect(within(toolbar).getByRole("button", { name: "Save" })).toBeVisible();
  const menu = screen.getByRole("menu", { name: "More" });
  for (const name of ["Open", "Macro library", "Export SVG", "Export All SVG", "Export JSON", "Undo", "Redo"]) {
    expect(within(menu).getByRole("menuitem", { name })).toBeVisible();
  }
});

it("desktop groups every export format as a distinct menu action", () => {
  // Given the desktop global toolbar
  renderToolbar();

  // When the user opens Export
  fireEvent.click(screen.getByRole("button", { name: "Export" }));

  // Then each existing export operation remains a separate choice
  const menu = screen.getByRole("menu", { name: "Export" });
  for (const name of ["Export SVG", "Export All SVG", "Export JSON"]) {
    expect(within(menu).getByRole("menuitem", { name })).toBeVisible();
  }
});
