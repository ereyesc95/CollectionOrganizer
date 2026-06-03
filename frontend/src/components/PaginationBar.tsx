import { useEffect, useState } from "react";

export const PAGE_SIZE_PRESETS = [25, 50, 100, 200] as const;
export const MIN_PAGE_SIZE = 1;
export const MAX_PAGE_SIZE = 500;
export const DEFAULT_PAGE_SIZE = 50;

export function clampPageSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, Math.round(value)));
}

export function loadPageSize(view: "grid" | "list"): number {
  const key = view === "grid" ? "page-size-grid" : "page-size-list";
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n)) return clampPageSize(n);
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PAGE_SIZE;
}

export function savePageSize(view: "grid" | "list", size: number): void {
  localStorage.setItem(
    view === "grid" ? "page-size-grid" : "page-size-list",
    String(clampPageSize(size))
  );
}

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function PaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const [draft, setDraft] = useState(String(pageSize));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setDraft(String(pageSize));
  }, [pageSize]);

  const commitDraft = () => {
    const parsed = parseInt(draft, 10);
    const next = clampPageSize(Number.isFinite(parsed) ? parsed : pageSize);
    setDraft(String(next));
    if (next !== pageSize) onPageSizeChange(next);
  };

  return (
    <nav className="header-pagination" aria-label="Collection pages">
      <button
        type="button"
        className="pagination-nav"
        disabled={safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
        aria-label="Previous page"
      >
        ‹
      </button>
      <span className="pagination-page">
        {safePage} of {totalPages}
      </span>
      <button
        type="button"
        className="pagination-nav"
        disabled={safePage >= totalPages}
        onClick={() => onPageChange(safePage + 1)}
        aria-label="Next page"
      >
        ›
      </button>
      <input
        type="number"
        className="pagination-size-input"
        min={MIN_PAGE_SIZE}
        max={MAX_PAGE_SIZE}
        step={1}
        value={draft}
        list="page-size-presets"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitDraft();
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label={`Items per page (${MIN_PAGE_SIZE}–${MAX_PAGE_SIZE})`}
        title="Items per page"
      />
      <datalist id="page-size-presets">
        {PAGE_SIZE_PRESETS.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </nav>
  );
}
