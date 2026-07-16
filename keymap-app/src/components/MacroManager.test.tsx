import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MacroManager } from "./MacroManager";
import type { MacroRegistry } from "../model/schema";

const handlers = {
  onAdd: () => {},
  onUpdate: () => {},
  onDelete: () => {},
};

function renderManager(macros: MacroRegistry = {}, overrides = {}) {
  return render(<MacroManager {...handlers} {...overrides} macros={macros} />);
}

describe("MacroManager", () => {
  it("lists every registry entry with its glyph, label, and steps", () => {
    renderManager({
      copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" },
      paste: { glyph: "⌃V", label: "Paste", steps: "hold Ctrl · tap V" },
    });

    expect(screen.getByLabelText(/copy glyph/i)).toHaveValue("⌃C");
    expect(screen.getByLabelText(/copy label/i)).toHaveValue("Copy");
    expect(screen.getByLabelText(/copy steps/i)).toHaveValue("hold Ctrl · tap C");
    expect(screen.getByLabelText(/paste glyph/i)).toHaveValue("⌃V");
  });

  it("commits a glyph edit on blur", () => {
    const onUpdate = vi.fn();
    renderManager({ copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" } }, { onUpdate });

    const input = screen.getByLabelText(/copy glyph/i);
    fireEvent.change(input, { target: { value: "⌃⇧C" } });
    fireEvent.blur(input);

    expect(onUpdate).toHaveBeenCalledWith("copy", {
      glyph: "⌃⇧C",
      label: "Copy",
      steps: "hold Ctrl · tap C",
    });
  });

  it("converts U+XXXX glyph input to its glyph on commit", () => {
    const onUpdate = vi.fn();
    renderManager({ copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" } }, { onUpdate });

    const input = screen.getByLabelText(/copy glyph/i);
    fireEvent.change(input, { target: { value: "U+2318" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onUpdate).toHaveBeenCalledWith("copy", {
      glyph: "⌘",
      label: "Copy",
      steps: "hold Ctrl · tap C",
    });
  });

  it("keeps an invalid glyph codepoint editable and explains it at the field without committing", () => {
    const onUpdate = vi.fn();
    renderManager(
      { copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" } },
      { onUpdate },
    );

    const input = screen.getByLabelText(/copy glyph/i);
    fireEvent.change(input, { target: { value: "U+ZZZZ" } });
    fireEvent.blur(input);

    expect(onUpdate).not.toHaveBeenCalled();
    expect(input).toHaveValue("U+ZZZZ");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/invalid codepoint/i);
  });

  it("commits the converted macro glyph and drops the error association once corrected", () => {
    const onUpdate = vi.fn();
    renderManager({ copy: { glyph: "⌃C", label: "Copy", steps: "" } }, { onUpdate });

    const input = screen.getByLabelText(/copy glyph/i);
    fireEvent.change(input, { target: { value: "U+ZZZZ" } });
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: "U+2318" } });
    fireEvent.blur(input);

    expect(onUpdate).toHaveBeenCalledWith("copy", { glyph: "⌘", label: "Copy", steps: "" });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveAccessibleDescription("");
  });

  it("commits a label edit on blur", () => {
    const onUpdate = vi.fn();
    renderManager({ copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" } }, { onUpdate });

    const input = screen.getByLabelText(/copy label/i);
    fireEvent.change(input, { target: { value: "Copy text" } });
    fireEvent.blur(input);

    expect(onUpdate).toHaveBeenCalledWith("copy", {
      glyph: "⌃C",
      label: "Copy text",
      steps: "hold Ctrl · tap C",
    });
  });

  it("commits a steps edit on blur", () => {
    const onUpdate = vi.fn();
    renderManager({ copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" } }, { onUpdate });

    const input = screen.getByLabelText(/copy steps/i);
    fireEvent.change(input, { target: { value: "hold LCtrl · tap C" } });
    fireEvent.blur(input);

    expect(onUpdate).toHaveBeenCalledWith("copy", {
      glyph: "⌃C",
      label: "Copy",
      steps: "hold LCtrl · tap C",
    });
  });

  it("deletes a macro when its delete control is used", () => {
    const onDelete = vi.fn();
    renderManager({ copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" } }, { onDelete });

    fireEvent.click(screen.getByLabelText(/delete copy/i));

    expect(onDelete).toHaveBeenCalledWith("copy");
  });

  it("adds a new macro from the name and glyph fields", () => {
    const onAdd = vi.fn();
    renderManager({}, { onAdd });

    fireEvent.change(screen.getByLabelText(/new macro name/i), { target: { value: "paste" } });
    fireEvent.change(screen.getByLabelText(/new macro glyph/i), { target: { value: "⌃V" } });
    fireEvent.click(screen.getByRole("button", { name: /add macro/i }));

    expect(onAdd).toHaveBeenCalledWith("paste", { glyph: "⌃V", label: "", steps: "" });
  });

  it("rejects adding a macro with an empty name and explains it at the name field", () => {
    const onAdd = vi.fn();
    renderManager({}, { onAdd });

    fireEvent.change(screen.getByLabelText(/new macro glyph/i), { target: { value: "⌃V" } });
    fireEvent.click(screen.getByRole("button", { name: /add macro/i }));

    expect(onAdd).not.toHaveBeenCalled();
    const name = screen.getByLabelText(/new macro name/i);
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription(/name is required/i);
  });

  it("rejects adding a macro whose name already exists and explains it at the name field", () => {
    const onAdd = vi.fn();
    renderManager({ copy: { glyph: "⌃C", label: "Copy", steps: "" } }, { onAdd });

    fireEvent.change(screen.getByLabelText(/new macro name/i), { target: { value: "copy" } });
    fireEvent.click(screen.getByRole("button", { name: /add macro/i }));

    expect(onAdd).not.toHaveBeenCalled();
    const name = screen.getByLabelText(/new macro name/i);
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription(/already exists/i);
  });

  it("clears the name error and adds the macro once the name is corrected", () => {
    const onAdd = vi.fn();
    renderManager({ copy: { glyph: "⌃C", label: "Copy", steps: "" } }, { onAdd });

    const name = screen.getByLabelText(/new macro name/i);
    fireEvent.change(name, { target: { value: "copy" } });
    fireEvent.click(screen.getByRole("button", { name: /add macro/i }));
    fireEvent.change(name, { target: { value: "paste" } });
    fireEvent.change(screen.getByLabelText(/new macro glyph/i), { target: { value: "⌃V" } });
    fireEvent.click(screen.getByRole("button", { name: /add macro/i }));

    expect(onAdd).toHaveBeenCalledWith("paste", { glyph: "⌃V", label: "", steps: "" });
    expect(name).not.toHaveAttribute("aria-invalid");
    expect(name).toHaveAccessibleDescription("");
  });
});
