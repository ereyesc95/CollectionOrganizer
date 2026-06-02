import { useMemo, useState } from "react";

const CUSTOM_PREFIX = "custom-facet-";

export function loadCustomOptions(kind: string): string[] {
  try {
    const raw = localStorage.getItem(`${CUSTOM_PREFIX}${kind}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomOption(kind: string, value: string) {
  const existing = loadCustomOptions(kind);
  if (!existing.includes(value)) {
    localStorage.setItem(`${CUSTOM_PREFIX}${kind}`, JSON.stringify([...existing, value]));
  }
}

interface MultiProps {
  label: string;
  kind: string;
  values: string[];
  options: string[];
  onChange: (v: string[]) => void;
  allowSplit?: boolean;
}

export function ValuePickerMulti({
  label,
  kind,
  values,
  options,
  onChange,
  allowSplit = true,
}: MultiProps) {
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");

  const allOptions = useMemo(() => {
    const set = new Set([...options, ...loadCustomOptions(kind), ...values]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [options, kind, values]);

  const toggle = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter((x) => x !== opt));
    } else {
      onChange([...values, opt]);
    }
  };

  const addNew = () => {
    const v = newVal.trim();
    if (!v) return;
    saveCustomOption(kind, v);
    const parts = allowSplit ? v.split("/").map((s) => s.trim()).filter(Boolean) : [v];
    const next = [...values];
    for (const p of parts) {
      if (!next.includes(p)) next.push(p);
    }
    onChange(next);
    setNewVal("");
    setAdding(false);
  };

  return (
    <div className="form-row value-picker">
      <label>{label}</label>
      <div className="chip-picker">
        {allOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`chip-option ${values.includes(opt) ? "selected" : ""}`}
            onClick={() => toggle(opt)}
          >
            {opt}
          </button>
        ))}
        {adding ? (
          <span className="chip-add-inline">
            <input
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              placeholder="New…"
              onKeyDown={(e) => {
                if (e.key === "Enter") addNew();
                if (e.key === "Escape") setAdding(false);
              }}
              autoFocus
            />
            <button type="button" className="chip-option selected" onClick={addNew}>
              ✓
            </button>
            <button type="button" className="chip-option" onClick={() => setAdding(false)}>
              ✕
            </button>
          </span>
        ) : (
          <button type="button" className="chip-option chip-add" onClick={() => setAdding(true)}>
            + Add
          </button>
        )}
      </div>
    </div>
  );
}

interface SingleProps {
  label: string;
  kind: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

export function ValuePickerSingle({ label, kind, value, options, onChange }: SingleProps) {
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");

  const allOptions = useMemo(() => {
    const set = new Set(["", ...options, ...loadCustomOptions(kind)]);
    if (value) set.add(value);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [options, kind, value]);

  const addNew = () => {
    const v = newVal.trim();
    if (!v) return;
    saveCustomOption(kind, v);
    onChange(v);
    setNewVal("");
    setAdding(false);
  };

  return (
    <div className="form-row value-picker">
      <label>{label}</label>
      <div className="chip-picker">
        {allOptions.map((opt) => (
          <button
            key={opt || "__none"}
            type="button"
            className={`chip-option ${value === opt ? "selected" : ""}`}
            onClick={() => onChange(opt)}
          >
            {opt || "None"}
          </button>
        ))}
        {adding ? (
          <span className="chip-add-inline">
            <input
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addNew();
                if (e.key === "Escape") setAdding(false);
              }}
              autoFocus
            />
            <button type="button" className="chip-option selected" onClick={addNew}>
              ✓
            </button>
            <button type="button" className="chip-option" onClick={() => setAdding(false)}>
              ✕
            </button>
          </span>
        ) : (
          <button type="button" className="chip-option chip-add" onClick={() => setAdding(true)}>
            + Add
          </button>
        )}
      </div>
    </div>
  );
}
