import { useState, type CSSProperties } from "react";
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

  return (
    <div className="km-action-menu">
      <button
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
        <div className="km-action-menu__popup" role="menu" aria-label={label}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="km-action-menu__item"
              role="menuitem"
              disabled={action.disabled}
              onClick={() => void action.onSelect()}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
