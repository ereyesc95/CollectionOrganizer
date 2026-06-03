import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SortKey } from "../types";
import SortBuilder from "./SortBuilder";

interface Props {
  theme: "dark" | "light";
  sortKeys: SortKey[];
  onSortChange: (keys: SortKey[]) => void;
  onThemeToggle: () => void;
  onSourceFolder: () => void;
  onImport: () => void;
  onAddRecord: () => void;
  onRefresh: () => void;
}

function MenuIcon({ children }: { children: ReactNode }) {
  return (
    <span className="menu-item-icon" aria-hidden>
      {children}
    </span>
  );
}

function IconAdd() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function IconImport() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" strokeLinecap="round" />
      <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3a6.5 6.5 0 1 0 11.5 11.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HeaderMenu({
  theme,
  sortKeys,
  onSortChange,
  onThemeToggle,
  onSourceFolder,
  onImport,
  onAddRecord,
  onRefresh,
}: Props) {
  const [open, setOpen] = useState(false);
  const [sortExpanded, setSortExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const closeMenu = () => {
    setOpen(false);
    setSortExpanded(false);
  };

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const run = (action: () => void) => {
    action();
    closeMenu();
  };

  const itemWithIcon = (icon: ReactNode, label: string, action: () => void) => (
    <button type="button" className="menu-item menu-item-with-icon" onClick={() => run(action)}>
      <MenuIcon>{icon}</MenuIcon>
      <span className="menu-item-label">{label}</span>
    </button>
  );

  return (
    <div className="header-menu" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost hamburger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Menu"
      >
        <span />
        <span />
        <span />
      </button>
      {open && (
        <div className={`menu-dropdown ${sortExpanded ? "menu-dropdown-wide" : ""}`}>
          {itemWithIcon(<IconAdd />, "Add record", onAddRecord)}
          {itemWithIcon(<IconFolder />, "Source folder", onSourceFolder)}
          {itemWithIcon(<IconImport />, "Import Excel", onImport)}
          {itemWithIcon(<IconRefresh />, "Refresh views", onRefresh)}
          <hr />
          <button
            type="button"
            className="menu-item menu-item-sort-toggle"
            onClick={() => setSortExpanded((e) => !e)}
          >
            <span className="menu-item-label">Advanced sort</span>
            <span className="menu-chevron">{sortExpanded ? "▴" : "▾"}</span>
          </button>
          {sortExpanded && (
            <div className="menu-sort-panel" onClick={(e) => e.stopPropagation()}>
              <SortBuilder sortKeys={sortKeys} onChange={onSortChange} />
            </div>
          )}
          <hr />
          {itemWithIcon(
            theme === "dark" ? <IconSun /> : <IconMoon />,
            theme === "dark" ? "Light mode" : "Dark mode",
            onThemeToggle
          )}
        </div>
      )}
    </div>
  );
}
