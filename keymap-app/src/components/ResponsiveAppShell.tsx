import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import "./ResponsiveAppShell.css";

const MODAL_BREAKPOINT = 900;
const FOCUSABLE = "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])";

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
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | SVGElement | null>(null);

  useEffect(() => {
    const updateWidth = () => setWidth(viewportWidth());
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useLayoutEffect(() => {
    if (!narrow || !editorOpen) return;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement || document.activeElement instanceof SVGElement
        ? document.activeElement
        : null;
    const focusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    focusable?.focus();
  }, [editorOpen, narrow]);

  const closeEditor = () => {
    onCloseEditor();
    returnFocusRef.current?.focus();
  };

  const trapDialogFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeEditor();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="km-responsive-shell" data-presentation={narrow ? "modal" : "docked"}>
      <section className="km-canvas-region" aria-label="Keyboard canvas">
        {children}
      </section>
      {narrow ? (
        editorOpen ? (
          <div className="km-editor-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor();
          }}>
            <section
              ref={dialogRef}
              className="km-editor-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Key editor"
              onKeyDown={trapDialogFocus}
            >
              <div className="km-editor-sheet__header">
                <strong>Legends</strong>
                <button type="button" className="km-btn" aria-label="Close key editor" onClick={closeEditor}>
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
