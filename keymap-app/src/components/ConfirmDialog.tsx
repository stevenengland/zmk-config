import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";

const backdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 40,
  display: "grid",
  placeItems: "center",
  padding: 24,
  background: "rgba(0, 0, 0, 0.76)",
};

const surface: CSSProperties = {
  width: "min(420px, 100%)",
  boxSizing: "border-box",
  padding: 20,
  border: "1px solid #3b494c",
  borderRadius: 8,
  background: "#131313",
  color: "#e5e2e1",
  fontFamily: "Inter, system-ui, sans-serif",
};

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const returnFocusTo = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    cancelRef.current?.focus();
    return () => returnFocusTo?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled])"));
    const first = controls[0];
    const last = controls.at(-1);
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
    <div style={backdrop}>
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        style={surface}
        onKeyDown={handleKeyDown}
      >
        <h2 id="confirm-dialog-title" style={{ margin: "0 0 8px", fontSize: 20 }}>{title}</h2>
        <p id="confirm-dialog-message" style={{ margin: "0 0 20px", color: "#bac9cc" }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button ref={cancelRef} type="button" className="km-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="km-btn km-btn--destructive"
            onClick={onConfirm}
            style={{ background: "#7f1d1d", borderColor: "#ffb4ab", color: "#fff" }}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
