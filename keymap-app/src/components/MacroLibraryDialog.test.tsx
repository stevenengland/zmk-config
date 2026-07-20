import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
