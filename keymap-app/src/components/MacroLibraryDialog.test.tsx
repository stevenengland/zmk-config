import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MacroLibraryDialog } from "./MacroLibraryDialog";

describe("MacroLibraryDialog", () => {
  it("wraps backward keyboard focus within the Macro library", () => {
    // Given the Macro library has focus on its first control
    render(
      <MacroLibraryDialog
        macros={{}}
        onAdd={() => {}}
        onUpdate={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: /macro library/i });

    // When focus moves backward from the first control
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });

    // Then focus wraps to the dialog's last control
    expect(screen.getByRole("button", { name: /add macro/i })).toHaveFocus();
  });

  it("reports a macro's board-position reference count before deletion", () => {
    // Given a macro assigned to two board positions
    render(
      <MacroLibraryDialog
        macros={{ copy: { glyph: "⌃C", label: "Copy", steps: "" } }}
        referenceCounts={{ copy: 2 }}
        onAdd={() => {}}
        onUpdate={() => {}}
        onDelete={vi.fn()}
        onClose={() => {}}
      />,
    );

    // When deletion is requested
    fireEvent.click(screen.getByRole("button", { name: /delete copy/i }));

    // Then confirmation names the macro and its assignment impact
    const confirmation = screen.getByRole("alertdialog", { name: /delete macro/i });
    expect(confirmation).toHaveTextContent('Delete macro "copy"?');
    expect(confirmation).toHaveTextContent("2 board positions");
  });

  it("keeps a macro unchanged when deletion is cancelled", () => {
    // Given deletion confirmation is open for a library macro
    const onDelete = vi.fn();
    render(
      <MacroLibraryDialog
        macros={{ copy: { glyph: "⌃C", label: "Copy", steps: "" } }}
        referenceCounts={{ copy: 1 }}
        onAdd={() => {}}
        onUpdate={() => {}}
        onDelete={onDelete}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /delete copy/i }));

    // When deletion is cancelled
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    // Then the macro remains and no deletion is requested
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/copy glyph/i)).toHaveValue("⌃C");
  });

  it("deletes a confirmed macro through the library boundary", () => {
    // Given deletion confirmation is open for a library macro
    const onDelete = vi.fn();
    render(
      <MacroLibraryDialog
        macros={{ copy: { glyph: "⌃C", label: "Copy", steps: "" } }}
        referenceCounts={{ copy: 1 }}
        onAdd={() => {}}
        onUpdate={() => {}}
        onDelete={onDelete}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /delete copy/i }));

    // When deletion is confirmed
    fireEvent.click(screen.getByRole("button", { name: /^delete macro$/i }));

    // Then the library requests deletion of the named macro
    expect(onDelete).toHaveBeenCalledWith("copy");
  });
});
