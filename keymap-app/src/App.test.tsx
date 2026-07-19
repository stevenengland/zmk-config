import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "./App";
import { KEY_STROKE, SYMBOL_FONT_FAMILY } from "./model/renderStyle";

describe("App", () => {
  afterEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  });

  it("mounts the keyboard board", () => {
    const { container } = render(<App />);
    expect(container.querySelector('svg[aria-label="Sofle Choc keyboard"]')).not.toBeNull();
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

  it("creates a macro in the Macros manager, assigns it to a key, and renders the glyph in a dashed chip on the board", () => {
    const { container } = render(<App />);

    fireEvent.change(screen.getByLabelText(/new macro name/i), { target: { value: "copy" } });
    fireEvent.change(screen.getByLabelText(/new macro glyph/i), { target: { value: "U+2303" } });
    fireEvent.click(screen.getByRole("button", { name: /add macro/i }));

    fireEvent.click(container.querySelector('[data-key-id="R-r2-c1"]')!);
    fireEvent.change(screen.getByLabelText(/^macro$/i), { target: { value: "copy" } });

    const legend = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    expect(legend).toContain("⌃");
    expect(container.querySelector('[data-key-id="R-r2-c1"] rect[stroke-dasharray]')).not.toBeNull();
  });

  it("adds a tap-dance row on a selected key and renders the dot-prefixed glyph on the board", () => {
    const { container } = render(<App />);

    fireEvent.click(container.querySelector('[data-key-id="L-r2-c1"]')!);
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
    first.blur();
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
    expect(screen.getByRole("status")).toHaveTextContent("");
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
    expect(screen.getAllByRole("tab")).toHaveLength(3);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(screen.getAllByRole("tab")).toHaveLength(2);

    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("undoes the same edit via the toolbar button as via the keyboard shortcut", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /add layer/i }));
    fireEvent.click(screen.getByRole("button", { name: /^undo$/i }));

    expect(screen.getAllByRole("tab")).toHaveLength(2);
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
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });
});
