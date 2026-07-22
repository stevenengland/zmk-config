import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./ActionMenu.css";

interface ActionMenuProps {
  label: string;
  actions: Array<{
    label: string;
    onSelect: () => void | Promise<void>;
    disabled?: boolean;
  }>;
  triggerStyle?: CSSProperties;
}

export function ActionMenu({ label, actions, triggerStyle }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeAndRestoreFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node) || rootRef.current?.contains(event.target)) return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={rootRef} className="km-action-menu">
      <button
        ref={triggerRef}
        type="button"
        className="km-btn"
        style={triggerStyle}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
      </button>
      {open ? (
        <div
          className="km-action-menu__popup"
          role="menu"
          aria-label={label}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            closeAndRestoreFocus();
          }}
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="km-action-menu__item"
              role="menuitem"
              disabled={action.disabled}
              onClick={() => {
                void action.onSelect();
                closeAndRestoreFocus();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
