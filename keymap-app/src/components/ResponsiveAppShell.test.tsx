import { render, screen } from "@testing-library/react";
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
});
