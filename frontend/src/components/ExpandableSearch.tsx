import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function ExpandableSearch({ value, onChange }: Props) {
  const [open, setOpen] = useState(Boolean(value));
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const expanded = open || Boolean(value);

  useEffect(() => {
    if (value) setOpen(true);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      if (!value) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, value]);

  return (
    <div
      ref={wrapRef}
      className={`search-wrap${expanded ? " search-wrap--expanded" : ""}`}
    >
      <button
        type="button"
        className="search-trigger"
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
        aria-label="Search"
        tabIndex={expanded ? -1 : 0}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20L16 16" strokeLinecap="round" />
        </svg>
      </button>
      <input
        ref={inputRef}
        className="search-input"
        type="search"
        placeholder="Search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        tabIndex={expanded ? 0 : -1}
        aria-hidden={!expanded}
      />
    </div>
  );
}
