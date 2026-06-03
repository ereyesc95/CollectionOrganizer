import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

interface MultiProps {
  label: string;
  values: string[];
  options: string[];
  onChange: (v: string[]) => void;
  allowSplit?: boolean;
  formatOption?: (value: string) => ReactNode;
  searchable?: boolean;
}

export function ValuePickerMulti({
  label,
  values,
  options,
  onChange,
  allowSplit = true,
  formatOption,
  searchable = false,
}: MultiProps) {
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [search, setSearch] = useState("");

  const allOptions = useMemo(() => {
    const set = new Set([...options, ...values]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [options, values]);

  const visibleOptions = useMemo(() => {
    if (!searchable) return allOptions;
    const q = search.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter(
      (o) => o.toLowerCase().includes(q) || values.includes(o)
    );
  }, [allOptions, searchable, search, values]);

  const toggle = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter((x) => x !== opt));
    } else {
      onChange([...values, opt]);
      if (searchable) setSearch("");
    }
  };

  const addNew = () => {
    const v = newVal.trim();
    if (!v) return;
    const parts = allowSplit ? v.split("/").map((s) => s.trim()).filter(Boolean) : [v];
    const next = [...values];
    for (const p of parts) {
      if (!next.includes(p)) next.push(p);
    }
    onChange(next);
    setNewVal("");
    setAdding(false);
    if (searchable) setSearch("");
  };

  return (
    <div className="form-row value-picker">
      <label>{label}</label>
      <div className="chip-picker-wrap">
        {searchable && (
          <input
            type="search"
            className="picker-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={`Search ${label}`}
          />
        )}
        <div className="chip-picker chip-picker--scroll">
          {visibleOptions.length === 0 ? (
            <span className="picker-empty">No matching tags</span>
          ) : (
            visibleOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`chip-option ${values.includes(opt) ? "selected" : ""}`}
                onClick={() => toggle(opt)}
              >
                {formatOption ? formatOption(opt) : opt}
              </button>
            ))
          )}
        </div>
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

interface SearchSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  formatOption?: (value: string) => ReactNode;
  allowEmpty?: boolean;
  /** Allow typing a value not in the options list (e.g. new artist names). */
  allowCustom?: boolean;
  /** Shown first (when present in options), e.g. most-used countries. */
  pinnedOptions?: string[];
  className?: string;
}

function canonicalOption(text: string, options: string[]): string | null {
  const q = text.trim().toLowerCase();
  if (!q) return null;
  return options.find((o) => o.toLowerCase() === q) ?? null;
}

function dedupeOptionsCaseInsensitive(options: string[], value: string): string[] {
  const canonical = new Map<string, string>();
  for (const o of options) {
    const key = o.toLowerCase();
    if (!canonical.has(key)) canonical.set(key, o);
  }
  if (value.trim()) {
    const key = value.trim().toLowerCase();
    if (!canonical.has(key)) canonical.set(key, value.trim());
  }
  return Array.from(canonical.values());
}

export function ValuePickerSearchSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "",
  formatOption,
  allowEmpty = true,
  allowCustom = false,
  pinnedOptions = [],
  className = "",
}: SearchSelectProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { pinnedInList, restInList } = useMemo(() => {
    const unique = dedupeOptionsCaseInsensitive(options, value);
    const set = new Set(unique);
    const pinned = pinnedOptions.filter((p) => set.has(p));
    const pinnedSet = new Set(pinned);
    const rest = unique
      .filter((o) => !pinnedSet.has(o))
      .sort((a, b) => a.localeCompare(b));
    return { pinnedInList: pinned, restInList: rest };
  }, [options, value, pinnedOptions]);

  const filterText = allowCustom ? (open ? query : value) : query;

  const filteredPinned = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return pinnedInList;
    return pinnedInList.filter((o) => o.toLowerCase().includes(q));
  }, [pinnedInList, filterText]);

  const filteredRest = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return restInList;
    return restInList.filter((o) => o.toLowerCase().includes(q));
  }, [restInList, filterText]);

  const showPinnedDivider =
    !filterText.trim() && filteredPinned.length > 0 && filteredRest.length > 0;

  const customQuery = filterText.trim();
  const showCustomOption =
    allowCustom &&
    !!customQuery &&
    ![...filteredPinned, ...filteredRest].some(
      (o) => o.toLowerCase() === customQuery.toLowerCase()
    );

  const closePicker = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        closePicker();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, closePicker]);

  const select = (next: string) => {
    const resolved = allowCustom ? (canonicalOption(next, options) ?? next) : next;
    onChange(resolved);
    setQuery("");
    setOpen(false);
  };

  const commitCustomText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const resolved = canonicalOption(trimmed, options) ?? trimmed;
      onChange(resolved);
      setQuery(resolved);
    },
    [options, onChange]
  );

  const openPicker = () => {
    setOpen(true);
    setQuery(allowCustom ? value : "");
  };

  const inputValue = allowCustom ? (open ? query : value) : open ? query : "";

  return (
    <div className={`form-row value-picker ${className}`.trim()}>
      <label>{label}</label>
      <div
        ref={wrapRef}
        className={`search-select ${open ? "open" : ""} ${value ? "has-value" : ""}${
          allowCustom ? " search-select--custom" : ""
        }`}
      >
        {value && !open && !allowCustom && (
          <span className="search-select-adorn" aria-hidden>
            {formatOption ? formatOption(value) : value}
          </span>
        )}
        <input
          ref={inputRef}
          type={allowCustom ? "text" : "search"}
          className="search-select-input"
          value={inputValue}
          placeholder={placeholder || undefined}
          onChange={(e) => {
            const next = e.target.value;
            if (allowCustom) {
              const resolved = canonicalOption(next, options) ?? next;
              setQuery(resolved);
              onChange(resolved);
              if (!open) setOpen(true);
            } else {
              setQuery(next);
            }
          }}
          onFocus={openPicker}
          onClick={() => {
            if (!open) openPicker();
          }}
          onBlur={() => {
            window.setTimeout(() => {
              if (!wrapRef.current?.contains(document.activeElement)) {
                if (allowCustom && query.trim()) {
                  commitCustomText(query);
                }
                closePicker();
              }
            }, 0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              closePicker();
              inputRef.current?.blur();
            }
            if (e.key === "Enter") {
              const q = (allowCustom ? query : filterText).trim();
              if (filteredPinned.length + filteredRest.length === 1) {
                e.preventDefault();
                select(filteredPinned[0] ?? filteredRest[0]!);
              } else if (allowCustom && q) {
                e.preventDefault();
                select(canonicalOption(q, options) ?? q);
              }
            }
          }}
          aria-label={label}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {value && allowEmpty && (
          <button
            type="button"
            className="search-select-clear"
            title="Clear"
            aria-label={`Clear ${label}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select("")}
          >
            ×
          </button>
        )}
        {open && (
          <ul className="search-select-list" role="listbox">
            {allowEmpty && (
              <li
                role="option"
                aria-selected={!value}
                className={`search-select-option ${!value ? "selected" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select("");
                }}
              >
                None
              </li>
            )}
            {filteredPinned.length === 0 &&
            filteredRest.length === 0 &&
            !showCustomOption ? (
              <li className="search-select-empty">No matches</li>
            ) : (
              <>
                {showCustomOption && (
                  <li
                    role="option"
                    aria-selected={value === customQuery}
                    className={`search-select-option search-select-option--custom ${
                      value === customQuery ? "selected" : ""
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(customQuery);
                    }}
                  >
                    Use &ldquo;{customQuery}&rdquo;
                  </li>
                )}
                {filteredPinned.map((opt) => (
                  <li
                    key={opt}
                    role="option"
                    aria-selected={value.toLowerCase() === opt.toLowerCase()}
                    className={`search-select-option ${
                      value.toLowerCase() === opt.toLowerCase() ? "selected" : ""
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(opt);
                    }}
                  >
                    {formatOption ? formatOption(opt) : opt}
                  </li>
                ))}
                {showPinnedDivider && <li className="search-select-divider" role="separator" />}
                {filteredRest.map((opt) => (
                  <li
                    key={opt}
                    role="option"
                    aria-selected={value.toLowerCase() === opt.toLowerCase()}
                    className={`search-select-option ${
                      value.toLowerCase() === opt.toLowerCase() ? "selected" : ""
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(opt);
                    }}
                  >
                    {formatOption ? formatOption(opt) : opt}
                  </li>
                ))}
              </>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

interface SingleProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

export function ValuePickerSingle({ label, value, options, onChange }: SingleProps) {
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");

  const allOptions = useMemo(() => {
    const set = new Set(["", ...options]);
    if (value) set.add(value);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [options, value]);

  const addNew = () => {
    const v = newVal.trim();
    if (!v) return;
    onChange(v);
    setNewVal("");
    setAdding(false);
  };

  return (
    <div className="form-row value-picker">
      <label>{label}</label>
      <div className="chip-picker-wrap">
        <div className="chip-picker chip-picker--scroll">
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
        </div>
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
