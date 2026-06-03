import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  browseSourceFolder,
  fetchFacets,
  fetchRecords,
  importExcel,
} from "./api";
import AppIcon, { faviconHref } from "./components/AppIcon";
import FiltersToggleIcon from "./components/FiltersToggleIcon";
import HeaderMenu from "./components/HeaderMenu";
import RecordGrid from "./components/RecordGrid";
import RecordModal from "./components/RecordModal";
import RecordTable from "./components/RecordTable";
import Sidebar from "./components/Sidebar";
import ViewToggle from "./components/ViewToggle";
import type { Facets, Filters, Record, SortKey, ViewMode } from "./types";
import { normalizeRecord } from "./utils/normalizeRecord";

const APP_NAME = "RecordStack";

const DEFAULT_SORT: SortKey[] = [
  { field: "artist", order: "asc" },
  { field: "year", order: "asc" },
];

function loadSortKeys(): SortKey[] {
  try {
    const raw = localStorage.getItem("sort-keys");
    if (raw) return JSON.parse(raw) as SortKey[];
  } catch {
    /* ignore */
  }
  return DEFAULT_SORT;
}

const defaultFilters: Filters = {
  search: "",
  media: [],
  animation: [],
  canvas: [],
  autograph: [],
  pending: [],
  releaseType: [],
  genre: [],
  country: [],
  hasAutograph: "",
  hasAnimation: "",
  hasCanvas: "",
  hasPending: "",
  hasCover: "",
  sortKeys: loadSortKeys(),
};

function buildParams(filters: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.search) p.set("search", filters.search);
  if (filters.media.length) p.set("media", filters.media.join(","));
  if (filters.animation.length) p.set("animation", filters.animation.join(","));
  if (filters.canvas.length) p.set("canvas", filters.canvas.join(","));
  if (filters.autograph.length) p.set("autograph", filters.autograph.join(","));
  if (filters.pending.length) p.set("pending", filters.pending.join(","));
  if (filters.releaseType.length) p.set("release_type", filters.releaseType.join(","));
  if (filters.genre.length) p.set("genre", filters.genre.join(","));
  if (filters.country.length) p.set("country", filters.country.join(","));
  if (filters.hasAutograph) p.set("has_autograph", filters.hasAutograph === "yes" ? "true" : "false");
  if (filters.hasAnimation) p.set("has_animation", filters.hasAnimation === "yes" ? "true" : "false");
  if (filters.hasCanvas) p.set("has_canvas", filters.hasCanvas === "yes" ? "true" : "false");
  if (filters.hasPending) p.set("has_pending", filters.hasPending === "yes" ? "true" : "false");
  if (filters.hasCover) p.set("has_cover", filters.hasCover === "yes" ? "true" : "false");
  p.set("sort", filters.sortKeys.map((k) => k.field).join(","));
  p.set("order", filters.sortKeys.map((k) => k.order).join(","));
  p.set("page_size", "500");
  return p;
}

function initialSidebarOpen(): boolean {
  try {
    if (window.matchMedia("(max-width: 768px)").matches) return false;
    return localStorage.getItem("sidebar-open") !== "0";
  } catch {
    return true;
  }
}

function scrollContainer(main: HTMLElement | null): HTMLElement | null {
  if (!main) return null;
  return main.querySelector<HTMLElement>(".table-scroll") ?? main;
}

export default function App() {
  const [facets, setFacets] = useState<Facets | null>(null);
  const [records, setRecords] = useState<Record[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [view, setView] = useState<ViewMode>(() =>
    (localStorage.getItem("view-mode") as ViewMode) || "grid"
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen);
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  const restoreScrollRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = faviconHref(theme);
  }, [theme]);

  useEffect(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("custom-facet-")) localStorage.removeItem(key);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("view-mode", view);
  }, [view]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (silent && mainRef.current) {
      restoreScrollRef.current = scrollContainer(mainRef.current)?.scrollTop ?? 0;
    } else if (!silent && mainRef.current) {
      const el = scrollContainer(mainRef.current);
      if (el) el.scrollTop = 0;
    }
    if (!silent) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const [facetData, listData] = await Promise.all([
        fetchFacets(),
        fetchRecords(buildParams(filters)),
      ]);
      setFacets(facetData);
      setRecords(listData.items.map(normalizeRecord));
      setTotal(listData.total);
      setLoadError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      setLoadError(msg);
      showToast(msg, "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (refreshKey === 0) return;
    void load({ silent: true });
  }, [refreshKey, load]);

  useLayoutEffect(() => {
    if (restoreScrollRef.current === null || !mainRef.current) return;
    const el = scrollContainer(mainRef.current);
    if (el) el.scrollTop = restoreScrollRef.current;
    restoreScrollRef.current = null;
  }, [records]);

  useEffect(() => {
    localStorage.setItem("sort-keys", JSON.stringify(filters.sortKeys));
  }, [filters.sortKeys]);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    localStorage.setItem("sidebar-open", next ? "1" : "0");
  };

  const activeChips = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    filters.media.forEach((m) =>
      chips.push({
        label: `Media: ${m}`,
        clear: () => setFilters((f) => ({ ...f, media: f.media.filter((x) => x !== m) })),
      })
    );
    filters.animation.forEach((m) =>
      chips.push({
        label: `Anim: ${m}`,
        clear: () => setFilters((f) => ({ ...f, animation: f.animation.filter((x) => x !== m) })),
      })
    );
    filters.canvas.forEach((m) =>
      chips.push({
        label: `Canvas: ${m}`,
        clear: () => setFilters((f) => ({ ...f, canvas: f.canvas.filter((x) => x !== m) })),
      })
    );
    return chips;
  }, [filters]);

  const handleImport = async () => {
    if (!confirm("Import from Collection.xlsx? Existing rows will be updated by cover key.")) return;
    try {
      const r = await importExcel(false);
      if (r.errors.length) showToast(`Import issues: ${r.errors[0]}`, "error");
      showToast(`Imported ${r.imported}, updated ${r.updated}, skipped ${r.skipped}`, "success");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Import failed", "error");
    }
  };

  const handleSourceFolder = async () => {
    try {
      const r = await browseSourceFolder();
      if (r.selected) {
        showToast("Source folder updated", "success");
        setRefreshKey((k) => k + 1);
      } else if (r.missing_subfolders?.length) {
        showToast(
          `Missing subfolders: ${r.missing_subfolders.join(", ")}`,
          "error"
        );
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not open folder picker", "error");
    }
  };

  return (
    <div className="app">
      <header className="header">
        <button
          type="button"
          className={`btn btn-ghost sidebar-toggle${sidebarOpen ? " is-active" : ""}`}
          onClick={toggleSidebar}
          title={sidebarOpen ? "Hide filters" : "Show filters"}
          aria-label={sidebarOpen ? "Hide filters" : "Show filters"}
          aria-pressed={sidebarOpen}
        >
          <FiltersToggleIcon />
        </button>
        <div className="brand">
          <AppIcon size={26} />
          <h1>{APP_NAME}</h1>
        </div>
        <span className="count">{total} records</span>
        <div className="header-actions">
          <label className="search-wrap">
            <span className="search-icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20L16 16" strokeLinecap="round" />
              </svg>
            </span>
            <input
              className="search-input"
              type="search"
              placeholder="Search"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </label>
          <ViewToggle view={view} onChange={setView} />
          <HeaderMenu
            theme={theme}
            sortKeys={filters.sortKeys}
            onSortChange={(sortKeys) => setFilters((f) => ({ ...f, sortKeys }))}
            onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            onSourceFolder={handleSourceFolder}
            onImport={handleImport}
            onAddRecord={() => {
              setSelected(null);
              setIsNew(true);
            }}
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </header>

      <div className={`layout ${sidebarOpen ? "sidebar-open" : "sidebar-hidden"}`}>
        {sidebarOpen && (
          <>
            <button
              type="button"
              className="sidebar-backdrop"
              onClick={toggleSidebar}
              aria-label="Close filters"
            />
            <Sidebar
              facets={facets}
              filters={filters}
              onChange={(p) => setFilters((f) => ({ ...f, ...p }))}
              onClear={() => setFilters({ ...defaultFilters, sortKeys: filters.sortKeys })}
            />
          </>
        )}
        <main className={`main ${view === "list" ? "main--list" : ""}`} ref={mainRef}>
          {activeChips.length > 0 && (
            <div className="chips">
              {activeChips.map((c) => (
                <span key={c.label} className="chip">
                  {c.label}
                  <button type="button" onClick={c.clear}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {loading ? (
            <div className="loading">Loading…</div>
          ) : loadError ? (
            <div className="load-error">
              <p>{loadError}</p>
              <p className="load-error-hint">
                Check that SleeveStack.exe or <code>python run.py</code> is running, then open{" "}
                <code>http://127.0.0.1:8000</code> (or the port shown in the terminal). In DevTools
                → Network, confirm <code>/api/records</code> returns 200.
              </p>
              <button type="button" className="btn-primary" onClick={() => void load()}>
                Retry
              </button>
            </div>
          ) : view === "list" ? (
            <RecordTable
              records={records}
              onSelect={(r) => {
                setSelected(r);
                setIsNew(false);
              }}
              onRefresh={() => setRefreshKey((k) => k + 1)}
              onToast={showToast}
            />
          ) : (
            <RecordGrid
              records={records}
              onSelect={(r) => {
                setSelected(r);
                setIsNew(false);
              }}
              onRefresh={() => setRefreshKey((k) => k + 1)}
              onToast={showToast}
            />
          )}
        </main>
      </div>

      {(selected || isNew) && (
        <RecordModal
          record={selected}
          isNew={isNew}
          facets={facets}
          onClose={() => {
            setSelected(null);
            setIsNew(false);
          }}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
