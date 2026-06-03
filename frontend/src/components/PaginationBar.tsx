import { useEffect, useRef, useState } from "react";

export const PAGE_SIZE_PRESETS = [25, 50, 100] as const;
export const MIN_PAGE_SIZE = 1;
export const MAX_PAGE_SIZE = 5000;
export const DEFAULT_PAGE_SIZE = 50;

export function clampPageSize(value: number, total = 0): number {
  if (!Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  const maxAllowed = total > 0 ? Math.max(MAX_PAGE_SIZE, total) : MAX_PAGE_SIZE;
  return Math.min(maxAllowed, Math.max(MIN_PAGE_SIZE, Math.round(value)));
}

export function loadPageSize(view: "grid" | "list"): number {
  const key = view === "grid" ? "page-size-grid" : "page-size-list";
  try {
    const raw = localStorage.getItem(key);
    if (raw === "all") return DEFAULT_PAGE_SIZE;
    if (raw) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n)) return clampPageSize(n);
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PAGE_SIZE;
}

export function savePageSize(view: "grid" | "list", size: number, total: number): void {
  const key = view === "grid" ? "page-size-grid" : "page-size-list";
  if (total > 0 && size >= total) {
    localStorage.setItem(key, "all");
    return;
  }
  localStorage.setItem(key, String(clampPageSize(size, total)));
}

function formatPageSize(size: number, total: number): string {
  if (total > 0 && size >= total) return "All";
  return String(size);
}

function parsePageSizeDraft(draft: string, total: number, fallback: number): number {
  const trimmed = draft.trim();
  if (trimmed.toLowerCase() === "all") {
    return Math.max(total, 1);
  }
  const parsed = parseInt(trimmed, 10);
  return clampPageSize(Number.isFinite(parsed) ? parsed : fallback, total);
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
  const [sizeDraft, setSizeDraft] = useState(formatPageSize(pageSize, total));
  const [pageDraft, setPageDraft] = useState(String(page));
  const [sizePresetsOpen, setSizePresetsOpen] = useState(false);
  const sizeWrapRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setSizeDraft(formatPageSize(pageSize, total));
  }, [pageSize, total]);

  useEffect(() => {
    setPageDraft(String(safePage));
  }, [safePage]);

  useEffect(() => {
    if (!sizePresetsOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (sizeWrapRef.current?.contains(e.target as Node)) return;
      setSizePresetsOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [sizePresetsOpen]);

  const commitSizeDraft = () => {
    const next = parsePageSizeDraft(sizeDraft, total, pageSize);
    setSizeDraft(formatPageSize(next, total));
    setSizePresetsOpen(false);
    if (next !== pageSize) onPageSizeChange(next);
  };

  const applySizePreset = (value: number | "all") => {
    const next = value === "all" ? Math.max(total, 1) : clampPageSize(value, total);
    setSizeDraft(formatPageSize(next, total));
    setSizePresetsOpen(false);
    if (next !== pageSize) onPageSizeChange(next);
  };

  const commitPageDraft = () => {
    const parsed = parseInt(pageDraft, 10);
    const next = Number.isFinite(parsed)
      ? Math.min(totalPages, Math.max(1, parsed))
      : safePage;
    setPageDraft(String(next));
    if (next !== page) onPageChange(next);
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
        <input
          type="text"
          inputMode="numeric"
          className="pagination-page-input"
          value={pageDraft}
          onChange={(e) => setPageDraft(e.target.value)}
          onBlur={commitPageDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitPageDraft();
              (e.target as HTMLInputElement).blur();
            }
          }}
          aria-label={`Current page (1–${totalPages})`}
        />
        <span className="pagination-page-sep">of</span>
        <span className="pagination-page-total">{totalPages}</span>
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
      <div className="pagination-size-wrap" ref={sizeWrapRef}>
        <input
          type="text"
          inputMode="numeric"
          className="pagination-size-input"
          value={sizeDraft}
          onChange={(e) => setSizeDraft(e.target.value)}
          onFocus={() => setSizePresetsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => {
              if (!sizeWrapRef.current?.contains(document.activeElement)) {
                commitSizeDraft();
              }
            }, 0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitSizeDraft();
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "Escape") {
              setSizeDraft(formatPageSize(pageSize, total));
              setSizePresetsOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          aria-label="Items per page"
          title="Items per page"
          aria-expanded={sizePresetsOpen}
          aria-haspopup="listbox"
        />
        {sizePresetsOpen && (
          <ul className="pagination-size-presets" role="listbox" aria-label="Page size presets">
            {PAGE_SIZE_PRESETS.map((n) => (
              <li key={n}>
                <button
                  type="button"
                  role="option"
                  className={
                    pageSize === n && sizeDraft !== "All" ? "is-active" : undefined
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applySizePreset(n)}
                >
                  {n}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                role="option"
                className={sizeDraft === "All" || pageSize >= total ? "is-active" : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applySizePreset("all")}
              >
                All
              </button>
            </li>
          </ul>
        )}
      </div>
    </nav>
  );
}
