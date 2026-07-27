import type { ReactNode } from "react";

/** Botón + panel desplegable de un filtro, reutilizando las clases fa-* de filter_agents.css. */
export function FilterDropdown({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fa-dropdown-wrap">
      <button
        type="button"
        className={`fa-filter-btn${count ? " fa-filter-btn--active" : ""}`}
        onClick={onToggle}
      >
        {label}

        {count > 0 && <span className="fa-filter-count">{count}</span>}

        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M2 3.5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="fa-panel">
          <div className="fa-panel-list">{children}</div>
        </div>
      )}
    </div>
  );
}

export function FilterOption({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`fa-option${active ? " fa-option--active" : ""}`}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
    >
      <span className="fa-option-check">{active ? "✓" : ""}</span>

      {color && <span className="fa-lbl-dot" style={{ background: color }} />}

      <span className="fa-option-label">{label}</span>
    </button>
  );
}

export function toggleValue(values: string[], value: string, update: (next: string[]) => void) {
  update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
}
