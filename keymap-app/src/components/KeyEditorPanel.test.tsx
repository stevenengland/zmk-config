import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { KeyEditorPanel } from "./KeyEditorPanel";
import type { KeyLegend } from "../model/schema";

const handlers = {
  onSetSlot: () => {},
  onSetColor: () => {},
  onError: () => {},
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

  it("recolors the primary legend", () => {
    const onSetColor = vi.fn();
    renderPanel("L-r0-c0", { primary: "A" }, { onSetColor });

    fireEvent.change(screen.getByLabelText(/primary color/i), {
      target: { value: "#fec931" },
    });

    expect(onSetColor).toHaveBeenCalledWith("#fec931");
  });
});
