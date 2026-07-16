import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TapDanceList } from "./TapDanceList";
import type { TapBinding } from "../model/schema";

const handlers = {
  onAdd: () => {},
  onUpdate: () => {},
  onDelete: () => {},
};

function renderList(taps: readonly TapBinding[] = [], overrides = {}) {
  return render(<TapDanceList {...handlers} {...overrides} taps={taps} />);
}

describe("TapDanceList", () => {
  it("lists every row with its count, glyph, and toggle state", () => {
    renderList([
      { count: 2, glyph: "⇪" },
      { count: 3, glyph: "⇧", toggle: true },
    ]);

    expect(screen.getByLabelText(/tap row 1 count/i)).toHaveValue(2);
    expect(screen.getByLabelText(/tap row 1 glyph/i)).toHaveValue("⇪");
    expect(screen.getByLabelText(/tap row 1 toggle/i)).not.toBeChecked();
    expect(screen.getByLabelText(/tap row 2 count/i)).toHaveValue(3);
    expect(screen.getByLabelText(/tap row 2 glyph/i)).toHaveValue("⇧");
    expect(screen.getByLabelText(/tap row 2 toggle/i)).toBeChecked();
  });

  it("commits a glyph edit on blur", () => {
    const onUpdate = vi.fn();
    renderList([{ count: 2, glyph: "⇪" }], { onUpdate });

    const input = screen.getByLabelText(/tap row 1 glyph/i);
    fireEvent.change(input, { target: { value: "⇧" } });
    fireEvent.blur(input);

    expect(onUpdate).toHaveBeenCalledWith(0, { count: 2, glyph: "⇧" });
  });

  it("keeps an invalid glyph codepoint editable and explains it at the row's field without committing", () => {
    const onUpdate = vi.fn();
    renderList([{ count: 2, glyph: "⇪" }], { onUpdate });

    const input = screen.getByLabelText(/tap row 1 glyph/i);
    fireEvent.change(input, { target: { value: "U+ZZZZ" } });
    fireEvent.blur(input);

    expect(onUpdate).not.toHaveBeenCalled();
    expect(input).toHaveValue("U+ZZZZ");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/invalid codepoint/i);
  });

  it("explains an invalid glyph only on the row being edited", () => {
    renderList([
      { count: 2, glyph: "⇪" },
      { count: 3, glyph: "⇧" },
    ]);

    const input = screen.getByLabelText(/tap row 1 glyph/i);
    fireEvent.change(input, { target: { value: "U+ZZZZ" } });
    fireEvent.blur(input);

    expect(screen.getByLabelText(/tap row 2 glyph/i)).not.toHaveAttribute("aria-invalid");
  });

  it("commits the converted tap glyph and drops the error association once corrected", () => {
    const onUpdate = vi.fn();
    renderList([{ count: 2, glyph: "⇪" }], { onUpdate });

    const input = screen.getByLabelText(/tap row 1 glyph/i);
    fireEvent.change(input, { target: { value: "U+ZZZZ" } });
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: "U+2318" } });
    fireEvent.blur(input);

    expect(onUpdate).toHaveBeenCalledWith(0, { count: 2, glyph: "⌘" });
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveAccessibleDescription("");
  });

  it("commits a count edit on blur, clamped to a minimum of 2", () => {
    const onUpdate = vi.fn();
    renderList([{ count: 2, glyph: "⇪" }], { onUpdate });

    const input = screen.getByLabelText(/tap row 1 count/i);
    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.blur(input);

    expect(onUpdate).toHaveBeenCalledWith(0, { count: 2, glyph: "⇪" });
  });

  it("commits a valid count edit on Enter", () => {
    const onUpdate = vi.fn();
    renderList([{ count: 2, glyph: "⇪" }], { onUpdate });

    const input = screen.getByLabelText(/tap row 1 count/i);
    fireEvent.change(input, { target: { value: "4" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onUpdate).toHaveBeenCalledWith(0, { count: 4, glyph: "⇪" });
  });

  it("toggles the toggle flag immediately", () => {
    const onUpdate = vi.fn();
    renderList([{ count: 2, glyph: "⇪" }], { onUpdate });

    fireEvent.click(screen.getByLabelText(/tap row 1 toggle/i));

    expect(onUpdate).toHaveBeenCalledWith(0, { count: 2, glyph: "⇪", toggle: true });
  });

  it("clearing the toggle flag omits it rather than persisting false", () => {
    const onUpdate = vi.fn();
    renderList([{ count: 2, glyph: "⇪", toggle: true }], { onUpdate });

    fireEvent.click(screen.getByLabelText(/tap row 1 toggle/i));

    expect(onUpdate).toHaveBeenCalledWith(0, { count: 2, glyph: "⇪" });
  });

  it("deletes a row when its delete control is used", () => {
    const onDelete = vi.fn();
    renderList([{ count: 2, glyph: "⇪" }], { onDelete });

    fireEvent.click(screen.getByLabelText(/delete tap row 1/i));

    expect(onDelete).toHaveBeenCalledWith(0);
  });

  it("adds a new row when 'Add tap row' is clicked", () => {
    const onAdd = vi.fn();
    renderList([], { onAdd });

    fireEvent.click(screen.getByRole("button", { name: /add tap row/i }));

    expect(onAdd).toHaveBeenCalled();
  });
});
