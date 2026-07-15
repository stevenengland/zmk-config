import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ResponsiveAppShell } from "./ResponsiveAppShell";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
}

describe("ResponsiveAppShell", () => {
  afterEach(() => setViewportWidth(1024));

  it("keeps a flexible canvas beside an internally scrolling editor at the desktop boundary", () => {
    // Given the desktop boundary width
    setViewportWidth(900);

    // When the shell is rendered
    render(
      <ResponsiveAppShell editor={<aside>Editor</aside>} editorOpen={false} onCloseEditor={() => {}}>
        <div>Board</div>
      </ResponsiveAppShell>,
    );

    const canvas = screen.getByRole("region", { name: /keyboard canvas/i });
    const editor = screen.getByRole("region", { name: /docked key editor/i });

    // Then both regions use the docked presentation
    expect(canvas.parentElement).toHaveAttribute("data-presentation", "docked");
    expect(editor).toHaveTextContent("Editor");
  });

  it("wraps focus backward within the narrow editor", () => {
    // Given an open editor at a narrow width
    setViewportWidth(899);
    render(
      <ResponsiveAppShell
        editor={<><button type="button">First field</button><button type="button">Last field</button></>}
        editorOpen
        onCloseEditor={() => {}}
      >
        <div>Board</div>
      </ResponsiveAppShell>,
    );
    const dialog = screen.getByRole("dialog", { name: /key editor/i });
    const close = screen.getByRole("button", { name: /close key editor/i });
    const last = screen.getByRole("button", { name: /last field/i });
    close.focus();

    // When focus moves backward from the first dialog control
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });

    // Then focus wraps to the final dialog control
    expect(last).toHaveFocus();
  });

  it("restores the selected position after Escape dismissal", () => {
    // Given focus on a board position before the narrow editor opens
    setViewportWidth(899);
    const onCloseEditor = vi.fn();
    const shell = (open: boolean) => (
      <>
        <button type="button">Selected position</button>
        <ResponsiveAppShell editor={<input aria-label="Legend" />} editorOpen={open} onCloseEditor={onCloseEditor}>
          <div>Board</div>
        </ResponsiveAppShell>
      </>
    );
    const { rerender } = render(shell(false));
    const selectedPosition = screen.getByRole("button", { name: /selected position/i });
    selectedPosition.focus();
    rerender(shell(true));

    // When the editor is dismissed with Escape
    const dialog = screen.getByRole("dialog", { name: /key editor/i });
    fireEvent.keyDown(dialog, { key: "Escape" });

    // Then dismissal is requested and focus returns to the board position
    expect(onCloseEditor).toHaveBeenCalledOnce();
    expect(selectedPosition).toHaveFocus();
  });

  it("dismisses from the backdrop without losing the return-focus target", () => {
    // Given focus on a board position before the narrow editor opens
    setViewportWidth(390);
    const onCloseEditor = vi.fn();
    const { rerender, container } = render(
      <>
        <button type="button">Selected position</button>
        <ResponsiveAppShell editor={<input aria-label="Legend" />} editorOpen={false} onCloseEditor={onCloseEditor}>
          <div>Board</div>
        </ResponsiveAppShell>
      </>,
    );
    const selectedPosition = screen.getByRole("button", { name: /selected position/i });
    selectedPosition.focus();
    rerender(
      <>
        <button type="button">Selected position</button>
        <ResponsiveAppShell editor={<input aria-label="Legend" />} editorOpen onCloseEditor={onCloseEditor}>
          <div>Board</div>
        </ResponsiveAppShell>
      </>,
    );

    // When the backdrop is pressed
    fireEvent.mouseDown(container.querySelector(".km-editor-backdrop")!);

    // Then dismissal is requested and focus returns to the board position
    expect(onCloseEditor).toHaveBeenCalledOnce();
    expect(selectedPosition).toHaveFocus();
  });
});
