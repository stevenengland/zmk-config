import { useEffect, useState, type ReactNode } from "react";
import "./ResponsiveAppShell.css";

const MODAL_BREAKPOINT = 900;

interface ResponsiveAppShellProps {
  children: ReactNode;
  editor: ReactNode;
  editorOpen: boolean;
  onCloseEditor: () => void;
}

function viewportWidth(): number {
  return typeof window === "undefined" ? MODAL_BREAKPOINT : window.innerWidth;
}

export function ResponsiveAppShell({
  children,
  editor,
  editorOpen,
  onCloseEditor,
}: ResponsiveAppShellProps) {
  const [width, setWidth] = useState(viewportWidth);
  const narrow = width < MODAL_BREAKPOINT;

  useEffect(() => {
    const updateWidth = () => setWidth(viewportWidth());
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <div className="km-responsive-shell" data-presentation={narrow ? "modal" : "docked"}>
      <section className="km-canvas-region" aria-label="Keyboard canvas">
        {children}
      </section>
      {narrow ? (
        editorOpen ? (
          <div className="km-editor-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) onCloseEditor();
          }}>
            <section className="km-editor-sheet" role="dialog" aria-modal="true" aria-label="Key editor">
              <div className="km-editor-sheet__header">
                <strong>Legends</strong>
                <button type="button" className="km-btn" aria-label="Close key editor" onClick={onCloseEditor}>
                  Close
                </button>
              </div>
              <div className="km-editor-sheet__body">{editor}</div>
            </section>
          </div>
        ) : null
      ) : (
        <div className="km-docked-editor" role="region" aria-label="Docked key editor">
          {editor}
        </div>
      )}
    </div>
  );
}
