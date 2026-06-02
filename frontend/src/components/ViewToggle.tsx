import type { ViewMode } from "../types";

interface Props {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}

export default function ViewToggle({ view, onChange }: Props) {
  const isGrid = view === "grid";
  return (
    <button
      type="button"
      className="btn btn-ghost view-switch-btn"
      onClick={() => onChange(isGrid ? "list" : "grid")}
      title={isGrid ? "Switch to list view" : "Switch to covers view"}
      aria-label={isGrid ? "Switch to list view" : "Switch to covers view"}
    >
      <span className="view-switch-icon" aria-hidden>
        {isGrid ? "☰" : "▦"}
      </span>
      <span className="view-switch-text">{isGrid ? "List" : "Covers"}</span>
    </button>
  );
}
