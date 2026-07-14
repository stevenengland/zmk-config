import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BindingEditor } from "./BindingEditor";
import type { HoldBinding } from "../model/schema";

const handlers = {
  onSetHold: () => {},
  onSetMacro: () => {},
  onError: () => {},
};

function renderEditor(keyId: string | null, hold: HoldBinding | undefined, overrides = {}) {
  return render(<BindingEditor {...handlers} {...overrides} keyId={keyId} hold={hold} />);
}

describe("BindingEditor", () => {
  it("binds the glyph and shifted fields to the key's hold binding", () => {
    renderEditor("L-r2-c1", { glyph: "ä", shifted: "Ä" });

    expect(screen.getByLabelText(/hold glyph/i)).toHaveValue("ä");
    expect(screen.getByLabelText(/hold shifted/i)).toHaveValue("Ä");
  });

  it("renders empty fields when the key has no hold binding", () => {
    renderEditor("L-r2-c1", undefined);

    expect(screen.getByLabelText(/hold glyph/i)).toHaveValue("");
    expect(screen.getByLabelText(/hold shifted/i)).toHaveValue("");
  });

  it("commits a hold glyph on blur", () => {
    const onSetHold = vi.fn();
    renderEditor("L-r2-c1", undefined, { onSetHold });

    const input = screen.getByLabelText(/hold glyph/i);
    fireEvent.change(input, { target: { value: "ä" } });
    fireEvent.blur(input);

    expect(onSetHold).toHaveBeenCalledWith({ glyph: "ä" });
  });

  it("commits the shifted variant alongside the existing glyph", () => {
    const onSetHold = vi.fn();
    renderEditor("L-r2-c1", { glyph: "ä" }, { onSetHold });

    const input = screen.getByLabelText(/hold shifted/i);
    fireEvent.change(input, { target: { value: "Ä" } });
    fireEvent.blur(input);

    expect(onSetHold).toHaveBeenCalledWith({ glyph: "ä", shifted: "Ä" });
  });

  it("converts U+XXXX input to its glyph on commit", () => {
    const onSetHold = vi.fn();
    renderEditor("L-r2-c1", undefined, { onSetHold });

    const input = screen.getByLabelText(/hold glyph/i);
    fireEvent.change(input, { target: { value: "U+00E4" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSetHold).toHaveBeenCalledWith({ glyph: "ä" });
  });

  it("routes an invalid codepoint to the error handler and leaves the field unchanged", () => {
    const onSetHold = vi.fn();
    const onError = vi.fn();
    renderEditor("L-r2-c1", { glyph: "ä" }, { onSetHold, onError });

    const input = screen.getByLabelText(/hold glyph/i);
    fireEvent.change(input, { target: { value: "U+ZZZZ" } });
    fireEvent.blur(input);

    expect(onError).toHaveBeenCalled();
    expect(onSetHold).not.toHaveBeenCalled();
    expect(input).toHaveValue("ä");
  });

  it("clears the whole hold binding when the glyph field is committed empty", () => {
    const onSetHold = vi.fn();
    renderEditor("L-r2-c1", { glyph: "ä", shifted: "Ä" }, { onSetHold });

    const input = screen.getByLabelText(/hold glyph/i);
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);

    expect(onSetHold).toHaveBeenCalledWith(undefined);
  });

  it("re-binds fields when the selected key changes", () => {
    const { rerender } = renderEditor("L-r2-c1", { glyph: "ä" });

    rerender(<BindingEditor {...handlers} keyId="L-r2-c2" hold={{ glyph: "ö" }} />);

    expect(screen.getByLabelText(/hold glyph/i)).toHaveValue("ö");
  });

  it("presets the mode select to Glyph, with Layer and Macro both selectable", () => {
    renderEditor("L-r2-c1", { glyph: "ä" });

    const select = screen.getByLabelText(/binding mode/i) as HTMLSelectElement;
    expect(select.value).toBe("glyph");
    expect(screen.getByRole("option", { name: "Layer" })).not.toBeDisabled();
    expect(screen.getByRole("option", { name: "Macro" })).not.toBeDisabled();
  });

  it("presets the mode select to Layer and the target layer when the key holds a layer reference", () => {
    renderEditor("L-r4-c4", { layer: "Nav" }, { layerNames: ["Base", "Nav"] });

    expect((screen.getByLabelText(/binding mode/i) as HTMLSelectElement).value).toBe("layer");
    expect((screen.getByLabelText(/target layer/i) as HTMLSelectElement).value).toBe("Nav");
  });

  it("commits a layer reference when a target layer is picked", () => {
    const onSetHold = vi.fn();
    renderEditor("L-r4-c4", { layer: "Base" }, { onSetHold, layerNames: ["Base", "Nav"] });

    fireEvent.change(screen.getByLabelText(/target layer/i), { target: { value: "Nav" } });

    expect(onSetHold).toHaveBeenCalledWith({ layer: "Nav" });
  });

  it("switches to Layer mode and commits the first available layer as the default target", () => {
    const onSetHold = vi.fn();
    renderEditor("L-r2-c1", undefined, { onSetHold, layerNames: ["Base", "Nav"] });

    fireEvent.change(screen.getByLabelText(/binding mode/i), { target: { value: "layer" } });

    expect(onSetHold).toHaveBeenCalledWith({ layer: "Base" });
    expect(screen.getByLabelText(/target layer/i)).toBeInTheDocument();
  });

  it("switches back to Glyph mode and restores the glyph fields", () => {
    const onSetHold = vi.fn();
    renderEditor("L-r2-c1", { glyph: "ä", shifted: "Ä" }, { onSetHold, layerNames: ["Base", "Nav"] });

    fireEvent.change(screen.getByLabelText(/binding mode/i), { target: { value: "layer" } });
    fireEvent.change(screen.getByLabelText(/binding mode/i), { target: { value: "glyph" } });

    expect(onSetHold).toHaveBeenLastCalledWith({ glyph: "ä", shifted: "Ä" });
    expect(screen.getByLabelText(/hold glyph/i)).toHaveValue("ä");
  });

  it("presets the mode select to Macro and the referenced name when the key holds a macro reference", () => {
    renderEditor("L-r2-c1", undefined, { macro: "copy", macroNames: ["copy", "paste"] });

    expect((screen.getByLabelText(/binding mode/i) as HTMLSelectElement).value).toBe("macro");
    expect((screen.getByLabelText(/^macro$/i) as HTMLSelectElement).value).toBe("copy");
  });

  it("commits a macro reference when a macro is picked", () => {
    const onSetMacro = vi.fn();
    renderEditor("L-r2-c1", undefined, { onSetMacro, macro: "copy", macroNames: ["copy", "paste"] });

    fireEvent.change(screen.getByLabelText(/^macro$/i), { target: { value: "paste" } });

    expect(onSetMacro).toHaveBeenCalledWith("paste");
  });

  it("switches to Macro mode and commits the first available macro as the default reference", () => {
    const onSetMacro = vi.fn();
    renderEditor("L-r2-c1", undefined, { onSetMacro, macroNames: ["copy", "paste"] });

    fireEvent.change(screen.getByLabelText(/binding mode/i), { target: { value: "macro" } });

    expect(onSetMacro).toHaveBeenCalledWith("copy");
    expect(screen.getByLabelText(/^macro$/i)).toBeInTheDocument();
  });

  it("switching to Macro mode commits a macro reference, restoring the prior glyph fields when switching back", () => {
    const onSetHold = vi.fn();
    const onSetMacro = vi.fn();
    renderEditor("L-r2-c1", { glyph: "ä" }, { onSetHold, onSetMacro, macroNames: ["copy"] });

    fireEvent.change(screen.getByLabelText(/binding mode/i), { target: { value: "macro" } });
    expect(onSetMacro).toHaveBeenCalledWith("copy");

    fireEvent.change(screen.getByLabelText(/binding mode/i), { target: { value: "glyph" } });
    expect(onSetHold).toHaveBeenLastCalledWith({ glyph: "ä" });
  });
});
