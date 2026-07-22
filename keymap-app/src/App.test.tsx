import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import { App } from "./App";
import { KEY_STROKE, SYMBOL_FONT_FAMILY } from "./model/renderStyle";

vi.mock("./io/persistence", () => ({
  openDocument: vi.fn(),
  saveDocument: vi.fn(),
}));
vi.mock("./io/export", () => ({
  exportLayerSvg: vi.fn(),
  exportAllLayersSvg: vi.fn(),
  exportJson: vi.fn(),
}));

import { exportJson, exportLayerSvg } from "./io/export";
import { openDocument, saveDocument } from "./io/persistence";
import { SCHEMA_VERSION, type KeymapDocument } from "./model/schema";

const OPENED_DOCUMENT: KeymapDocument = {
  schemaVersion: SCHEMA_VERSION,
  layers: [{ name: "Opened", color: "#fec931", keys: {} }],
};

describe("App", () => {
  afterEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  });

  it("clears an untitled document's unsaved state after saving", async () => {
    // Given a new document whose persistence boundary will save successfully
    vi.mocked(saveDocument).mockResolvedValue(null);
    render(<App />);

    // When the document is edited and saved
    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    // Then the dirty state clears and the save is visibly confirmed
    await waitFor(() => expect(screen.queryByText(/Unsaved changes/)).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("Saved keymap");
  }, 15_000);

  it("restores an opened document's saved state through undo and redo", async () => {
    // Given a named document opened from persistence
    vi.mocked(openDocument).mockResolvedValue({
      document: OPENED_DOCUMENT,
      handle: null,
      filename: "workshop.json",
    });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^open$/i }));
    await screen.findByText("workshop.json");

    // When an edit is undone exactly to the opened content
    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    fireEvent.click(screen.getByRole("button", { name: /^undo$/i }));

    // Then the saved state returns, while redo restores the edit and dirty state
    expect(screen.queryByText(/Unsaved changes/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^redo$/i }));
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument();
  }, 20_000);

  it("keeps navigation and editor presentation out of document dirty state", () => {
    // Given a clean document at a phone width
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const { container } = render(<App />);

    // When selection, sheet, zoom, and view presentation state changes
    fireEvent.click(container.querySelector('[data-key-id="L-r0-c0"]')!);
    fireEvent.click(screen.getByRole("button", { name: /close key editor/i }));
    fireEvent.click(screen.getByRole("button", { name: /zoom in/i }));
    fireEvent.click(screen.getByRole("tab", { name: /all/i }));

    // Then the canonical document remains clean
    expect(screen.queryByText(/Unsaved changes/)).not.toBeInTheDocument();
  }, 15_000);

  it.each([
    ["Export SVG", exportLayerSvg],
    ["Export JSON", exportJson],
  ])("keeps unsaved document state after using %s", (buttonName, exportOperation) => {
    // Given a document with unsaved canonical content
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));

    // When the document is exported
    fireEvent.click(screen.getByRole("button", { name: /^export$/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: buttonName }));

    // Then export runs without changing the saved fingerprint
    expect(exportOperation).toHaveBeenCalledOnce();
    expect(screen.getByText(/Unsaved changes/)).toBeInTheDocument();
  });

  it.each([
    ["clean", false, true],
    ["dirty", true, false],
  ])("allows unload for a %s document only", (_state, editDocument, unloadAllowed) => {
    // Given a document in the requested canonical state
    render(<App />);
    if (editDocument) fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    const event = new Event("beforeunload", { cancelable: true });

    // When the browser asks whether it may close or reload
    const result = window.dispatchEvent(event);

    // Then only clean content unloads without a warning request
    expect(result).toBe(unloadAllowed);
  });

  it("mounts the keyboard board", () => {
    const { container } = render(<App />);
    expect(container.querySelector('svg[aria-label="Sofle Choc keyboard"]')).not.toBeNull();
  });

  it("guides the first board selection and keeps the board summary visible afterward", () => {
    // Given a fresh app session
    const { container } = render(<App />);

    expect(screen.getByText("58 keys · 2 encoders")).toBeInTheDocument();
    expect(screen.getByText(/use arrow keys to move/i)).toBeInTheDocument();

    // When the first board position is selected
    fireEvent.click(container.querySelector('[data-key-id="L-r0-c0"]')!);

    // Then contextual guidance clears while the board summary remains
    expect(screen.queryByText(/use arrow keys to move/i)).not.toBeInTheDocument();
    expect(screen.getByText("58 keys · 2 encoders")).toBeInTheDocument();
  });

  it("arrow navigation followed by Enter opens the selected position editor", () => {
    // Given the board at a phone width with focus on its single Tab stop
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const { container } = render(<App />);
    const entry = container.querySelector<SVGGElement>('[data-key-id="L-r0-c0"]')!;
    act(() => entry.focus());

    // When the user moves right and activates the focused position
    fireEvent.keyDown(entry, { key: "ArrowRight" });
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });

    // Then the selected position opens in the editor
    expect(screen.getByRole("dialog", { name: /key editor/i })).toBeInTheDocument();
    expect(container.querySelector('[data-key-id="L-r0-c1"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("embeds the symbol font globally, independent of the picker's mount state", () => {
    const { container } = render(<App />);

    const styles = Array.from(container.querySelectorAll("style")).map((s) => s.textContent);
    expect(styles.some((css) => css?.includes("@font-face") && css.includes(SYMBOL_FONT_FAMILY))).toBe(
      true,
    );
  });

  it("boots with one default layer shown as the active tab, after the All entry", () => {
    render(<App />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent("All");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
  });

  it("adds a new active layer when the add control is used", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
  });

  it("enters overview mode with one block per layer when All is clicked, and returns to edit on a layer tab", () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));

    fireEvent.click(screen.getByRole("tab", { name: /all/i }));

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(container.querySelectorAll('svg[aria-label="Sofle Choc keyboard"]')).toHaveLength(2);

    fireEvent.click(screen.getByRole("tab", { name: "Base" }));

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(container.querySelectorAll('svg[aria-label="Sofle Choc keyboard"]')).toHaveLength(1);
  });

  it("uses the same Fit and zoom controls in Edit and Overview without clearing selection", () => {
    // Given a selected key in Edit with shared viewport controls
    const { container } = render(<App />);
    const key = container.querySelector('[data-key-id="L-r0-c0"]')!;
    fireEvent.click(key);
    expect(screen.getByRole("button", { name: /^fit$/i })).toBeInTheDocument();

    // When the user switches to Overview
    fireEvent.click(screen.getByRole("tab", { name: /all/i }));

    // Then the shared controls and selection remain available
    expect(screen.getByRole("button", { name: /^fit$/i })).toBeInTheDocument();
    expect(container.querySelector('[data-key-id="L-r0-c0"][aria-pressed="true"]')).not.toBeNull();
  });

  it("binds the editor to a clicked key and renders a committed legend on the board", () => {
    const { container } = render(<App />);

    fireEvent.click(container.querySelector('[data-key-id="L-r0-c0"]')!);
    expect(screen.getByRole("heading", { name: /empty key/i })).toBeInTheDocument();
    expect(screen.getByText(/L-r0-c0/)).toBeInTheDocument();

    const input = screen.getByLabelText(/primary legend/i);
    fireEvent.change(input, { target: { value: "U+2318" } });
    fireEvent.blur(input);

    const legend = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(legend).toContain("⌘");
  });

  it("edits a selected board position in the narrow-screen modal and keeps the result after close", () => {
    // Given a selected board position at a phone width
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const { container } = render(<App />);
    const key = container.querySelector('[data-key-id="L-r0-c0"]')!;

    fireEvent.click(key);

    const editor = screen.getByRole("dialog", { name: /key editor/i });
    expect(editor).toBeInTheDocument();

    // When the legend is edited and the sheet is closed
    const input = screen.getByLabelText(/primary legend/i);
    fireEvent.change(input, { target: { value: "U+2318" } });
    fireEvent.blur(input);
    fireEvent.click(screen.getByRole("button", { name: /close key editor/i }));

    // Then the edit and selection remain visible on the board
    expect(screen.queryByRole("dialog", { name: /key editor/i })).not.toBeInTheDocument();
    expect(key).toHaveAttribute("aria-pressed", "true");
    expect(Array.from(container.querySelectorAll("text"), (node) => node.textContent)).toContain("⌘");
  });

  it("pointer selection anchors roving focus and editor dismissal restores the selected position", () => {
    // Given an unselected board at a phone width
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const { container } = render(<App />);
    const selectedPosition = container.querySelector<SVGGElement>('[data-key-id="R-r2-c1"]')!;

    // When the position is clicked and its editor is dismissed
    fireEvent.click(selectedPosition);
    expect(selectedPosition.getAttribute("tabindex")).toBe("0");
    fireEvent.click(screen.getByRole("button", { name: /close key editor/i }));

    // Then keyboard navigation resumes from the selected board position
    expect(document.activeElement?.getAttribute("data-key-id")).toBe("R-r2-c1");
  });

  it("keeps global and layer controls reachable through named toolbars at narrow widths", () => {
    // Given a phone viewport
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });

    // When the app is rendered
    render(<App />);

    const globalControls = screen.getByRole("toolbar", { name: /global controls/i });
    const layerControls = screen.getByRole("toolbar", { name: /layer controls/i });

    // Then primary global and layer actions remain reachable
    expect(globalControls).toContainElement(screen.getByRole("button", { name: /^save$/i }));
    expect(layerControls).toContainElement(screen.getByRole("button", { name: /add layer/i }));
  });

  it("opens the Macro library from the global toolbar with focus inside", () => {
    // Given the keymap editor is open
    render(<App />);

    // When document-wide macro management is requested
    fireEvent.click(screen.getByRole("button", { name: /macro library/i }));

    // Then the Macro library opens and receives focus
    const dialog = screen.getByRole("dialog", { name: /macro library/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("restores focus to Macro library when the dialog closes", () => {
    // Given the Macro library was opened from its toolbar trigger
    render(<App />);
    const trigger = screen.getByRole("button", { name: /macro library/i });
    act(() => trigger.focus());
    fireEvent.click(trigger);

    // When the Macro library is closed
    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));

    // Then focus returns to the invoking control
    expect(trigger).toHaveFocus();
  });

  it("adds a library macro to per-key assignment choices without embedding its form in the key editor", () => {
    // Given a selected position with its Behaviors task open
    const { container } = render(<App />);
    fireEvent.click(container.querySelector('[data-key-id="R-r2-c1"]')!);
    fireEvent.click(screen.getByRole("tab", { name: "Behaviors" }));
    const editor = screen.getByRole("region", { name: /docked key editor/i });

    // When a macro is created in the document-wide library
    fireEvent.click(screen.getByRole("button", { name: /macro library/i }));
    const dialog = screen.getByRole("dialog", { name: /macro library/i });
    fireEvent.change(within(dialog).getByLabelText(/new macro name/i), { target: { value: "copy" } });
    fireEvent.change(within(dialog).getByLabelText(/new macro glyph/i), { target: { value: "⌃C" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /add macro/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^close$/i }));

    // Then the key can assign it without containing the global macro form
    expect(within(editor).getByRole("option", { name: "copy" })).toBeInTheDocument();
    expect(within(editor).queryByLabelText(/new macro name/i)).not.toBeInTheDocument();
  });

  it("creates a macro in the Macros manager, assigns it to a key, and renders the glyph in a dashed chip on the board", () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /macro library/i }));
    const dialog = screen.getByRole("dialog", { name: /macro library/i });
    fireEvent.change(within(dialog).getByLabelText(/new macro name/i), { target: { value: "copy" } });
    fireEvent.change(within(dialog).getByLabelText(/new macro glyph/i), { target: { value: "U+2303" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /add macro/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^close$/i }));

    fireEvent.click(container.querySelector('[data-key-id="R-r2-c1"]')!);
    fireEvent.click(screen.getByRole("tab", { name: "Behaviors" }));
    fireEvent.change(screen.getByLabelText(/^macro$/i), { target: { value: "copy" } });

    const legend = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(legend).toContain("⌃");
    expect(container.querySelector('[data-key-id="R-r2-c1"] rect[stroke-dasharray]')).not.toBeNull();
  });

  it("reports the number of assigned board positions before macro deletion", () => {
    // Given one key is assigned to a library macro
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /macro library/i }));
    let dialog = screen.getByRole("dialog", { name: /macro library/i });
    fireEvent.change(within(dialog).getByLabelText(/new macro name/i), { target: { value: "copy" } });
    fireEvent.change(within(dialog).getByLabelText(/new macro glyph/i), { target: { value: "⌃C" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /add macro/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^close$/i }));
    fireEvent.click(container.querySelector('[data-key-id="R-r2-c1"]')!);
    fireEvent.click(screen.getByRole("tab", { name: "Behaviors" }));
    fireEvent.change(screen.getByLabelText(/^macro$/i), { target: { value: "copy" } });
    fireEvent.click(screen.getByRole("button", { name: /macro library/i }));
    dialog = screen.getByRole("dialog", { name: /macro library/i });

    // When deletion is requested
    fireEvent.click(within(dialog).getByRole("button", { name: /delete copy/i }));

    // Then the confirmation reports the assignment that will be cleared
    expect(screen.getByRole("alertdialog", { name: /delete macro/i })).toHaveTextContent(
      "1 board position will have this macro assignment cleared",
    );
  });

  it("adds a tap-dance row on a selected key and renders the dot-prefixed glyph on the board", () => {
    const { container } = render(<App />);

    fireEvent.click(container.querySelector('[data-key-id="L-r2-c1"]')!);
    fireEvent.click(screen.getByRole("tab", { name: "Behaviors" }));
    fireEvent.click(screen.getByRole("button", { name: /add tap row/i }));

    const glyphInput = screen.getByLabelText(/tap row 1 glyph/i);
    fireEvent.change(glyphInput, { target: { value: "U+2328" } });
    fireEvent.blur(glyphInput);

    const legend = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(legend).toContain("··⌨");
  });

  it("deletes a tap-dance row via its delete control and drops it from the board", () => {
    const { container } = render(<App />);

    fireEvent.click(container.querySelector('[data-key-id="L-r2-c1"]')!);
    fireEvent.click(screen.getByRole("tab", { name: "Behaviors" }));
    fireEvent.click(screen.getByRole("button", { name: /add tap row/i }));
    const glyphInput = screen.getByLabelText(/tap row 1 glyph/i);
    fireEvent.change(glyphInput, { target: { value: "U+2328" } });
    fireEvent.blur(glyphInput);

    fireEvent.click(screen.getByLabelText(/delete tap row 1/i));

    const legend = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(legend).not.toContain("··⌨");
  });

  it("clicking a key in the overview selects it, switches the active layer to its owner, keeps overview docked, and focuses the field", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    fireEvent.click(screen.getByRole("tab", { name: /all/i }));

    const before = screen.getAllByRole("listitem");
    const beforeColors = before.map((item) => item.style.borderColor);

    fireEvent.click(before[0].querySelector('[data-key-id="L-r0-c0"]')!);

    // overview stays open, editor docked
    const after = screen.getAllByRole("listitem");
    expect(after).toHaveLength(2);
    expect(screen.getByRole("heading", { name: /empty key/i })).toBeInTheDocument();
    expect(screen.getByText(/L-r0-c0/)).toBeInTheDocument();

    // active-layer highlight moved onto the clicked block
    expect(after[0].style.borderColor).toBe(beforeColors[1]);
    expect(after[1].style.borderColor).toBe(beforeColors[0]);

    // clicked key's primary field is focused with its text selected
    const input = screen.getByLabelText(/primary legend/i);
    expect(document.activeElement).toBe(input);
  });

  it("re-focuses the primary field when the same key position is picked on a different layer", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    fireEvent.click(screen.getByRole("tab", { name: /all/i }));

    const blocks = screen.getAllByRole("listitem");
    // First pick: position L-r0-c0 on the first layer's block focuses the field.
    fireEvent.click(blocks[0].querySelector('[data-key-id="L-r0-c0"]')!);
    const first = screen.getByLabelText(/primary legend/i) as HTMLInputElement;
    expect(document.activeElement).toBe(first);

    // A real browser click blurs the field; jsdom does not, so blur explicitly
    // to prove the follow-up pick is what re-focuses.
    act(() => first.blur());
    expect(document.activeElement).not.toBe(first);

    // Second pick: the SAME position on the other layer's block. selectedKeyId
    // is unchanged (ids are position-based), so focus must re-fire off the
    // active-layer switch, not off keyId.
    fireEvent.click(screen.getAllByRole("listitem")[1].querySelector('[data-key-id="L-r0-c0"]')!);
    const second = screen.getByLabelText(/primary legend/i) as HTMLInputElement;
    expect(document.activeElement).toBe(second);
    expect(second.selectionStart).toBe(0);
  });

  it("marks a key homing board-wide: renders on every layer and persists the id", () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    fireEvent.click(container.querySelector('[data-key-id="L-r0-c0"]')!);
    fireEvent.click(screen.getByRole("tab", { name: "Properties" }));

    fireEvent.click(screen.getByLabelText(/homing key/i));

    fireEvent.click(screen.getByRole("tab", { name: /all/i }));
    const items = screen.getAllByRole("listitem");
    items.forEach((item) => {
      const keyGroup = item.querySelector('[data-key-id="L-r0-c0"]')!;
      expect(keyGroup.querySelector(`rect[fill="${KEY_STROKE}"]`)).toBeTruthy();
    });
  });

  it("unchecking homing removes the bar and the checkbox stays in sync per key", () => {
    const { container } = render(<App />);
    fireEvent.click(container.querySelector('[data-key-id="L-r0-c0"]')!);
    fireEvent.click(screen.getByRole("tab", { name: "Properties" }));
    fireEvent.click(screen.getByLabelText(/homing key/i));
    expect(screen.getByLabelText(/homing key/i)).toBeChecked();

    fireEvent.click(screen.getByLabelText(/homing key/i));

    expect(screen.getByLabelText(/homing key/i)).not.toBeChecked();
    const keyGroup = container.querySelector('[data-key-id="L-r0-c0"]')!;
    expect(keyGroup.querySelector(`rect[fill="${KEY_STROKE}"]`)).toBeNull();
  });

  it("explains an invalid codepoint at the field and leaves the status bar alone", () => {
    const { container } = render(<App />);

    fireEvent.click(container.querySelector('[data-key-id="L-r0-c0"]')!);
    const input = screen.getByLabelText(/primary legend/i);
    fireEvent.change(input, { target: { value: "U+ZZZZ" } });
    fireEvent.blur(input);

    expect(input).toHaveAccessibleDescription(/invalid codepoint/i);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("draws the corrected legend on the canvas once the invalid input is fixed", () => {
    const { container } = render(<App />);

    fireEvent.click(container.querySelector('[data-key-id="L-r0-c0"]')!);
    const input = screen.getByLabelText(/primary legend/i);
    fireEvent.change(input, { target: { value: "U+ZZZZ" } });
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: "U+2318" } });
    fireEvent.blur(input);

    expect(input).toHaveAccessibleDescription("");
    expect(Array.from(container.querySelectorAll("text"), (node) => node.textContent)).toContain("⌘");
  });

  it("starts with undo/redo disabled and enables undo after an edit", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));

    expect(screen.getByRole("button", { name: /undo/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
  });

  it("undoes and redoes a layer add via Ctrl+Z / Ctrl+Shift+Z", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    expect(within(screen.getByRole("toolbar", { name: /layer controls/i })).getAllByRole("tab")).toHaveLength(3);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(within(screen.getByRole("toolbar", { name: /layer controls/i })).getAllByRole("tab")).toHaveLength(2);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(within(screen.getByRole("toolbar", { name: /layer controls/i })).getAllByRole("tab")).toHaveLength(3);
  });

  it("undoes the same edit via the toolbar button as via the keyboard shortcut", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    fireEvent.click(screen.getByRole("button", { name: /^undo$/i }));

    expect(within(screen.getByRole("toolbar", { name: /layer controls/i })).getAllByRole("tab")).toHaveLength(2);
  });

  it("clears the redo stack once a new edit follows an undo", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));

    expect(screen.getByRole("button", { name: /redo/i })).toBeDisabled();
  });

  it("leaves a focused text field's own undo alone instead of hijacking Ctrl+Z", () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    fireEvent.click(container.querySelector('[data-key-id="L-r0-c0"]')!);
    const input = screen.getByLabelText(/primary legend/i);

    fireEvent.keyDown(input, { key: "z", ctrlKey: true });

    // The layer add is still on the undo stack — the shortcut didn't fire
    // while focus was inside a text field.
    expect(within(screen.getByRole("toolbar", { name: /layer controls/i })).getAllByRole("tab")).toHaveLength(3);
  });
});
