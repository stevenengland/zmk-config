import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MacroManager } from "./MacroManager";
import type { MacroRegistry } from "../model/schema";

const handlers = {
  onAdd: () => {},
  onUpdate: () => {},
  onDelete: () => {},
  onError: () => {},
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

  it("routes an invalid glyph codepoint to the error handler and leaves the field unchanged", () => {
    const onUpdate = vi.fn();
    const onError = vi.fn();
    renderManager(
      { copy: { glyph: "⌃C", label: "Copy", steps: "hold Ctrl · tap C" } },
      { onUpdate, onError },
    );

    const input = screen.getByLabelText(/copy glyph/i);
    fireEvent.change(input, { target: { value: "U+ZZZZ" } });
    fireEvent.blur(input);

    expect(onError).toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(input).toHaveValue("⌃C");
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

  it("rejects adding a macro with an empty name", () => {
    const onAdd = vi.fn();
    const onError = vi.fn();
    renderManager({}, { onAdd, onError });

    fireEvent.change(screen.getByLabelText(/new macro glyph/i), { target: { value: "⌃V" } });
    fireEvent.click(screen.getByRole("button", { name: /add macro/i }));

    expect(onError).toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("rejects adding a macro whose name already exists in the registry", () => {
    const onAdd = vi.fn();
    const onError = vi.fn();
    renderManager({ copy: { glyph: "⌃C", label: "Copy", steps: "" } }, { onAdd, onError });

    fireEvent.change(screen.getByLabelText(/new macro name/i), { target: { value: "copy" } });
    fireEvent.click(screen.getByRole("button", { name: /add macro/i }));

    expect(onError).toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
  });
});
