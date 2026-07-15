import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ResponsiveAppShell } from "./ResponsiveAppShell";

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
}

describe("ResponsiveAppShell", () => {
  afterEach(() => setViewportWidth(1024));

  it("keeps a flexible canvas beside an internally scrolling editor at the desktop boundary", () => {
    setViewportWidth(900);
    render(
      <ResponsiveAppShell editor={<aside>Editor</aside>} editorOpen={false} onCloseEditor={() => {}}>
        <div>Board</div>
      </ResponsiveAppShell>,
    );

    const canvas = screen.getByRole("region", { name: /keyboard canvas/i });
    const editor = screen.getByRole("region", { name: /docked key editor/i });

    expect(canvas.parentElement).toHaveAttribute("data-presentation", "docked");
    expect(editor).toHaveTextContent("Editor");
  });

  it("traps focus in the narrow editor and restores the selected position after Escape", () => {
    setViewportWidth(899);
    const onCloseEditor = vi.fn();
    const shell = (open: boolean) => (
      <>
        <button type="button">Selected position</button>
        <ResponsiveAppShell
          editor={<><button type="button">First field</button><button type="button">Last field</button></>}
          editorOpen={open}
          onCloseEditor={onCloseEditor}
        >
          <div>Board</div>
        </ResponsiveAppShell>
      </>
    );
    const { rerender } = render(shell(false));
    const selectedPosition = screen.getByRole("button", { name: /selected position/i });
    selectedPosition.focus();

    rerender(shell(true));
    const dialog = screen.getByRole("dialog", { name: /key editor/i });
    const close = screen.getByRole("button", { name: /close key editor/i });
    const last = screen.getByRole("button", { name: /last field/i });
    close.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onCloseEditor).toHaveBeenCalledOnce();
    expect(selectedPosition).toHaveFocus();
  });

  it("dismisses from the backdrop without losing the return-focus target", () => {
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

    fireEvent.mouseDown(container.querySelector(".km-editor-backdrop")!);

    expect(onCloseEditor).toHaveBeenCalledOnce();
    expect(selectedPosition).toHaveFocus();
  });
});
