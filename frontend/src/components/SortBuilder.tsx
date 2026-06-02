import type { SortKey } from "../types";

const FIELDS: { id: SortKey["field"]; label: string }[] = [
  { id: "artist", label: "Artist" },
  { id: "year", label: "Year" },
  { id: "title", label: "Title" },
  { id: "edition", label: "Edition" },
];

interface Props {
  sortKeys: SortKey[];
  onChange: (keys: SortKey[]) => void;
}

export default function SortBuilder({ sortKeys, onChange }: Props) {
  const add = () => {
    const used = new Set(sortKeys.map((k) => k.field));
    const next = FIELDS.find((f) => !used.has(f.id));
    if (!next) return;
    onChange([...sortKeys, { field: next.id, order: "asc" }]);
  };

  const update = (i: number, patch: Partial<SortKey>) => {
    const next = sortKeys.map((k, idx) => (idx === i ? { ...k, ...patch } : k));
    onChange(next);
  };

  const remove = (i: number) => {
    if (sortKeys.length <= 1) return;
    onChange(sortKeys.filter((_, idx) => idx !== i));
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sortKeys.length) return;
    const next = [...sortKeys];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="sort-builder">
      {sortKeys.map((k, i) => (
        <div key={i} className="sort-row">
          <span className="sort-priority">{i + 1}</span>
          <select
            value={k.field}
            onChange={(e) => update(i, { field: e.target.value as SortKey["field"] })}
          >
            {FIELDS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`btn btn-ghost sort-dir ${k.order}`}
            onClick={() => update(i, { order: k.order === "asc" ? "desc" : "asc" })}
            title="Toggle direction"
          >
            {k.order === "asc" ? "↑" : "↓"}
          </button>
          <button type="button" className="btn btn-ghost sort-move" onClick={() => move(i, -1)} disabled={i === 0}>
            ▲
          </button>
          <button
            type="button"
            className="btn btn-ghost sort-move"
            onClick={() => move(i, 1)}
            disabled={i === sortKeys.length - 1}
          >
            ▼
          </button>
          {sortKeys.length > 1 && (
            <button type="button" className="btn btn-ghost sort-remove" onClick={() => remove(i)}>
              ×
            </button>
          )}
        </div>
      ))}
      {sortKeys.length < FIELDS.length && (
        <button type="button" className="btn btn-ghost sort-add" onClick={add}>
          + Add sort column
        </button>
      )}
    </div>
  );
}
