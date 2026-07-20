import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { MacroDef, MacroRegistry } from "../model/schema";
import { MacroManager } from "./MacroManager";
import { ConfirmDialog } from "./ConfirmDialog";

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 30,
  display: "grid",
  placeItems: "center",
  padding: 24,
  background: "rgba(0, 0, 0, 0.72)",
};

const surface: CSSProperties = {
  width: "min(560px, 100%)",
  maxHeight: "80dvh",
  overflow: "auto",
  boxSizing: "border-box",
  padding: 20,
  border: "1px solid #3b494c",
  borderRadius: 8,
  background: "#131313",
  color: "#e5e2e1",
  fontFamily: "Inter, system-ui, sans-serif",
};

interface MacroLibraryDialogProps {
  macros: MacroRegistry;
  referenceCounts?: Readonly<Record<string, number>>;
  onAdd: (name: string, def: MacroDef) => void;
  onUpdate: (name: string, def: MacroDef) => void;
  onDelete: (name: string) => void;
  onClose: () => void;
}

export function MacroLibraryDialog({
  macros,
  referenceCounts = {},
  onAdd,
  onUpdate,
  onDelete,
  onClose,
}: MacroLibraryDialogProps) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const returnFocusTo = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeRef.current?.focus();
    return () => returnFocusTo?.focus();
  }, []);

  const trapFocus = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <div style={backdrop} aria-hidden={pendingDelete !== null}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="macro-library-title"
        style={surface}
        onKeyDown={trapFocus}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <h2 id="macro-library-title" style={{ margin: 0 }}>Macro library</h2>
          <button ref={closeRef} type="button" className="km-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <MacroManager macros={macros} onAdd={onAdd} onUpdate={onUpdate} onDelete={setPendingDelete} />
      </section>
      </div>
      {pendingDelete && (
        <ConfirmDialog
          title={`Delete macro "${pendingDelete}"?`}
          message={`${referenceCounts[pendingDelete] ?? 0} board position${(referenceCounts[pendingDelete] ?? 0) === 1 ? "" : "s"} will have this macro assignment cleared.`}
          confirmLabel="Delete macro"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDelete(pendingDelete);
            setPendingDelete(null);
          }}
        />
      )}
    </>
  );
}
