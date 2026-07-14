import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { KeyEditorPanel } from "./KeyEditorPanel";
import type { KeyLegend } from "../model/schema";
import symbols from "../data/symbols.json";

const firstGlyph = symbols.categories[0].symbols[0];

const handlers = {
  activeIndex: 0,
  onSetSlot: () => {},
  onSetColor: () => {},
  onError: () => {},
  homing: false,
  onToggleHoming: () => {},
  onSetHold: () => {},
  onSetMacro: () => {},
  macros: {},
  onAddMacro: () => {},
  onUpdateMacro: () => {},
  onDeleteMacro: () => {},
  onAddTap: () => {},
  onUpdateTap: () => {},
  onDeleteTap: () => {},
};

function renderPanel(keyId: string | null, legend: KeyLegend = {}, overrides = {}) {
  return render(
    <KeyEditorPanel {...handlers} {...overrides} keyId={keyId} legend={legend} />,
  );
}

describe("KeyEditorPanel", () => {
  it("prompts to select a key when nothing is selected", () => {
    renderPanel(null);

    expect(screen.getByText(/select a key/i)).toBeInTheDocument();
  });

  it("binds the three slot fields to the selected key's legend", () => {
    renderPanel("L-r0-c0", { primary: "A", shifted: "!", altgr: "@" });

    expect(screen.getByLabelText(/primary legend/i)).toHaveValue("A");
    expect(screen.getByLabelText(/shifted legend/i)).toHaveValue("!");
    expect(screen.getByLabelText(/altgr legend/i)).toHaveValue("@");
  });

  it("commits plain slot text on blur", () => {
    const onSetSlot = vi.fn();
    renderPanel("L-r0-c0", {}, { onSetSlot });

    const input = screen.getByLabelText(/primary legend/i);
    fireEvent.change(input, { target: { value: "Q" } });
    fireEvent.blur(input);

    expect(onSetSlot).toHaveBeenCalledWith("primary", "Q");
  });

  it("converts U+XXXX input to its glyph on commit", () => {
    const onSetSlot = vi.fn();
    renderPanel("L-r0-c0", {}, { onSetSlot });

    const input = screen.getByLabelText(/shifted legend/i);
    fireEvent.change(input, { target: { value: "U+2318" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSetSlot).toHaveBeenCalledWith("shifted", "⌘");
  });

  it("routes an invalid codepoint to the error handler and leaves the slot unchanged", () => {
    const onSetSlot = vi.fn();
    const onError = vi.fn();
    renderPanel("L-r0-c0", { primary: "A" }, { onSetSlot, onError });

    const input = screen.getByLabelText(/primary legend/i);
    fireEvent.change(input, { target: { value: "U+ZZZZ" } });
    fireEvent.blur(input);

    expect(onError).toHaveBeenCalled();
    expect(onSetSlot).not.toHaveBeenCalled();
    expect(input).toHaveValue("A");
  });

  it("clears a slot by committing an empty field", () => {
    const onSetSlot = vi.fn();
    renderPanel("L-r0-c0", { primary: "A" }, { onSetSlot });

    const input = screen.getByLabelText(/primary legend/i);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onSetSlot).toHaveBeenCalledWith("primary", "");
  });

  it("inserts a picked symbol into the focused slot", () => {
    const onSetSlot = vi.fn();
    renderPanel("L-r0-c0", {}, { onSetSlot });

    const shifted = screen.getByLabelText(/shifted legend/i);
    fireEvent.focus(shifted);
    fireEvent.click(screen.getByRole("button", { name: `Insert ${firstGlyph}` }));

    expect(onSetSlot).toHaveBeenCalledWith("shifted", firstGlyph);
    expect(shifted).toHaveValue(firstGlyph);
  });

  it("inserts a picked symbol into the primary slot before any field is focused", () => {
    const onSetSlot = vi.fn();
    renderPanel("L-r0-c0", {}, { onSetSlot });

    fireEvent.click(screen.getByRole("button", { name: `Insert ${firstGlyph}` }));

    expect(onSetSlot).toHaveBeenCalledWith("primary", firstGlyph);
  });

  it("reflects the homing state in the checkbox", () => {
    renderPanel("L-r0-c0", {}, { homing: true });

    expect(screen.getByLabelText(/homing key/i)).toBeChecked();
  });

  it("toggles homing on checkbox click", () => {
    const onToggleHoming = vi.fn();
    renderPanel("L-r0-c0", {}, { onToggleHoming });

    fireEvent.click(screen.getByLabelText(/homing key/i));

    expect(onToggleHoming).toHaveBeenCalledTimes(1);
  });

  it("shows the On hold group with the shared binding editor bound to the key's hold glyph", () => {
    renderPanel("L-r2-c1", { primary: "a", hold: { glyph: "ä", shifted: "Ä" } });

    expect(screen.getByText(/on hold/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hold glyph/i)).toHaveValue("ä");
    expect(screen.getByLabelText(/hold shifted/i)).toHaveValue("Ä");
  });

  it("commits a hold glyph via onSetHold", () => {
    const onSetHold = vi.fn();
    renderPanel("L-r2-c1", { primary: "a" }, { onSetHold });

    const input = screen.getByLabelText(/hold glyph/i);
    fireEvent.change(input, { target: { value: "ä" } });
    fireEvent.blur(input);

    expect(onSetHold).toHaveBeenCalledWith({ glyph: "ä" });
  });

  it("forwards layer names to the binding editor's Layer-mode picker", () => {
    renderPanel("L-r4-c4", { hold: { layer: "Nav" } }, { layerNames: ["Base", "Nav"] });

    expect((screen.getByLabelText(/binding mode/i) as HTMLSelectElement).value).toBe("layer");
    expect((screen.getByLabelText(/target layer/i) as HTMLSelectElement).value).toBe("Nav");
  });

  it("forwards the registry's names to the binding editor's Macro-mode picker, bound to the key's macro reference", () => {
    renderPanel(
      "R-r2-c1",
      { macro: "copy" },
      { macros: { copy: { glyph: "⌃C", label: "Copy", steps: "" }, paste: { glyph: "⌃V", label: "Paste", steps: "" } } },
    );

    expect((screen.getByLabelText(/binding mode/i) as HTMLSelectElement).value).toBe("macro");
    expect((screen.getByLabelText(/^macro$/i) as HTMLSelectElement).value).toBe("copy");
  });

  it("commits a macro reference via onSetMacro", () => {
    const onSetMacro = vi.fn();
    renderPanel("R-r2-c1", {}, { onSetMacro, macros: { copy: { glyph: "⌃C", label: "Copy", steps: "" } } });

    fireEvent.change(screen.getByLabelText(/binding mode/i), { target: { value: "macro" } });

    expect(onSetMacro).toHaveBeenCalledWith("copy");
  });

  it("shows the Macros manager with every registry entry, regardless of the selected key", () => {
    renderPanel("L-r0-c0", {}, { macros: { copy: { glyph: "⌃C", label: "Copy", steps: "" } } });

    expect(screen.getAllByText(/macros/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/copy glyph/i)).toHaveValue("⌃C");
  });

  it("shows the Macros manager even when no key is selected", () => {
    renderPanel(null, {}, { macros: { copy: { glyph: "⌃C", label: "Copy", steps: "" } } });

    expect(screen.getByLabelText(/copy glyph/i)).toHaveValue("⌃C");
  });

  it("adds a macro via onAddMacro", () => {
    const onAddMacro = vi.fn();
    renderPanel(null, {}, { onAddMacro });

    fireEvent.change(screen.getByLabelText(/new macro name/i), { target: { value: "copy" } });
    fireEvent.change(screen.getByLabelText(/new macro glyph/i), { target: { value: "⌃C" } });
    fireEvent.click(screen.getByRole("button", { name: /add macro/i }));

    expect(onAddMacro).toHaveBeenCalledWith("copy", { glyph: "⌃C", label: "", steps: "" });
  });

  it("deletes a macro via onDeleteMacro", () => {
    const onDeleteMacro = vi.fn();
    renderPanel(null, {}, { onDeleteMacro, macros: { copy: { glyph: "⌃C", label: "Copy", steps: "" } } });

    fireEvent.click(screen.getByLabelText(/delete copy/i));

    expect(onDeleteMacro).toHaveBeenCalledWith("copy");
  });

  it("lists the selected key's tap-dance rows", () => {
    renderPanel("L-r0-c0", { primary: "⇧", taps: [{ count: 2, glyph: "⇪" }] });

    expect(screen.getByLabelText(/tap row 1 glyph/i)).toHaveValue("⇪");
  });

  it("adds a tap-dance row via onAddTap", () => {
    const onAddTap = vi.fn();
    renderPanel("L-r0-c0", { primary: "⇧" }, { onAddTap });

    fireEvent.click(screen.getByRole("button", { name: /add tap row/i }));

    expect(onAddTap).toHaveBeenCalled();
  });

  it("deletes a tap-dance row via onDeleteTap", () => {
    const onDeleteTap = vi.fn();
    renderPanel("L-r0-c0", { primary: "⇧", taps: [{ count: 2, glyph: "⇪" }] }, { onDeleteTap });

    fireEvent.click(screen.getByLabelText(/delete tap row 1/i));

    expect(onDeleteTap).toHaveBeenCalledWith(0);
  });

  it("recolors the primary legend", () => {
    const onSetColor = vi.fn();
    renderPanel("L-r0-c0", { primary: "A" }, { onSetColor });

    fireEvent.change(screen.getByLabelText(/primary color/i), {
      target: { value: "#fec931" },
    });

    expect(onSetColor).toHaveBeenCalledWith("#fec931");
  });

  it("focuses the primary legend input and selects its text when a key is selected", () => {
    renderPanel("L-r0-c0", { primary: "ABC" });

    const input = screen.getByLabelText(/primary legend/i) as HTMLInputElement;
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(3);
  });

  it("re-focuses and re-selects the primary legend input when selection moves to a different key", () => {
    const { rerender } = renderPanel("L-r0-c0", { primary: "ABC" });

    const first = screen.getByLabelText(/primary legend/i) as HTMLInputElement;
    first.blur();
    expect(first).not.toHaveFocus();

    rerender(
      <KeyEditorPanel {...handlers} keyId="L-r0-c1" legend={{ primary: "XY" }} />,
    );

    const second = screen.getByLabelText(/primary legend/i) as HTMLInputElement;
    expect(second).toHaveFocus();
    expect(second.selectionStart).toBe(0);
    expect(second.selectionEnd).toBe(2);
  });
});
