import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BindingEditor } from "./BindingEditor";

const handlers = {
  onSetHold: () => {},
  onError: () => {},
};

function renderEditor(keyId: string | null, hold: { glyph: string; shifted?: string } | undefined, overrides = {}) {
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

  it("presets the mode select to Glyph, with Layer and Macro not yet selectable", () => {
    renderEditor("L-r2-c1", { glyph: "ä" });

    const select = screen.getByLabelText(/binding mode/i) as HTMLSelectElement;
    expect(select.value).toBe("glyph");
    expect(screen.getByRole("option", { name: "Layer" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Macro" })).toBeDisabled();
  });
});
