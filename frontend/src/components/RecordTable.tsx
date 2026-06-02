import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Record } from "../types";
import { albumKey, editionLabel, displayYear } from "../utils/recordDisplay";
import HoverPreview from "./HoverPreview";

interface Props {
  records: Record[];
  onSelect: (r: Record) => void;
}

type SortField =
  | "artist"
  | "title"
  | "edition"
  | "year"
  | "media"
  | "animation"
  | "canvas"
  | "autographs"
  | "pending";

type AlbumGroup = { key: string; items: Record[] };

const COLS: { id: SortField; label: string; resizable: boolean }[] = [
  { id: "artist", label: "Artist", resizable: true },
  { id: "title", label: "Title", resizable: true },
  { id: "edition", label: "Edition", resizable: true },
  { id: "year", label: "Year", resizable: true },
  { id: "media", label: "Media", resizable: true },
  { id: "animation", label: "Animation", resizable: true },
  { id: "canvas", label: "Canvas", resizable: true },
  { id: "autographs", label: "Autographs", resizable: true },
  { id: "pending", label: "Pending", resizable: true },
];

const DEFAULT_WIDTHS: { [key: string]: number } = {
  artist: 140,
  title: 180,
  edition: 200,
  year: 64,
  media: 88,
  animation: 110,
  canvas: 110,
  autographs: 120,
  pending: 100,
};

function loadWidths(): { [key: string]: number } {
  try {
    const raw = localStorage.getItem("table-col-widths");
    if (raw) return { ...DEFAULT_WIDTHS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_WIDTHS };
}

function sortValue(r: Record, field: SortField): string | number {
  switch (field) {
    case "artist":
      return r.artist.toLowerCase();
    case "title":
      return r.title.toLowerCase();
    case "edition":
      return editionLabel(r).toLowerCase();
    case "year":
      return displayYear(r) === "????" ? 0 : parseInt(displayYear(r), 10) || 0;
    case "media":
      return r.media_tags.join(",").toLowerCase();
    case "animation":
      return r.animation_tags.join(",").toLowerCase();
    case "canvas":
      return r.canvas_tags.join(",").toLowerCase();
    case "autographs":
      return r.autograph_tags.join(",").toLowerCase();
    case "pending":
      return (r.pending ?? "").toLowerCase();
    default:
      return "";
  }
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function buildGroups(records: Record[]): AlbumGroup[] {
  const result: AlbumGroup[] = [];
  for (const r of records) {
    const key = albumKey(r);
    const last = result[result.length - 1];
    if (last && last.key === key) {
      last.items.push(r);
    } else {
      result.push({ key, items: [r] });
    }
  }
  return result;
}

export default function RecordTable({ records, onSelect }: Props) {
  const [coverHover, setCoverHover] = useState<{
    src: string;
    alt: string;
    rect: DOMRect;
  } | null>(null);
  const [autoHover, setAutoHover] = useState<{
    src: string;
    alt: string;
    rect: DOMRect;
  } | null>(null);
  const [sortField, setSortField] = useState<SortField>("artist");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [colWidths, setColWidths] = useState(loadWidths);
  const resizing = useRef<{ col: string; startX: number; startW: number } | null>(null);

  const groups = useMemo(() => {
    const raw = buildGroups(records);
    const mul = sortDir === "asc" ? 1 : -1;
    return [...raw].sort((ga, gb) => {
      const va = sortValue(ga.items[0], sortField);
      const vb = sortValue(gb.items[0], sortField);
      const c = compare(va, vb) * mul;
      if (c !== 0) return c;
      return ga.key.localeCompare(gb.key);
    });
  }, [records, sortField, sortDir]);

  const onHeaderClick = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const onResizeStart = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = { col, startX: e.clientX, startW: colWidths[col] ?? 100 };
  };

  const onResizeMove = useCallback((e: MouseEvent) => {
    if (!resizing.current) return;
    const delta = e.clientX - resizing.current.startX;
    const w = Math.max(48, resizing.current.startW + delta);
    setColWidths((prev: { [key: string]: number }) => ({ ...prev, [resizing.current!.col]: w }));
  }, []);

  const onResizeEnd = useCallback(() => {
    if (resizing.current) {
      setColWidths((prev: { [key: string]: number }) => {
        localStorage.setItem("table-col-widths", JSON.stringify(prev));
        return prev;
      });
    }
    resizing.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeEnd);
    return () => {
      window.removeEventListener("mousemove", onResizeMove);
      window.removeEventListener("mouseup", onResizeEnd);
    };
  }, [onResizeMove, onResizeEnd]);

  if (!records.length) {
    return <div className="empty">No records match your filters.</div>;
  }

  return (
    <>
      <div className="table-scroll">
        <table className="records-table" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            {COLS.map((c) => (
              <col key={c.id} style={{ width: colWidths[c.id] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.id}
                  className={`th-sortable ${sortField === c.id ? `sorted-${sortDir}` : ""}`}
                  onClick={() => onHeaderClick(c.id)}
                >
                  <span className="th-label">
                    {c.label}
                    {sortField === c.id && (
                      <span className="sort-indicator">{sortDir === "asc" ? " ↑" : " ↓"}</span>
                    )}
                  </span>
                  {c.resizable && (
                    <span
                      className="col-resizer"
                      onMouseDown={(e) => onResizeStart(c.id, e)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) =>
              g.items.map((r, idx) => (
                <tr
                  key={r.id}
                  onClick={() => onSelect(r)}
                  className={idx > 0 ? "group-cont" : "group-start"}
                >
                  {idx === 0 && (
                    <>
                      <td rowSpan={g.items.length} className="cell-artist">
                        {r.artist}
                        {g.items.length > 1 && (
                          <span className="album-versions">{g.items.length} ver.</span>
                        )}
                      </td>
                      <td rowSpan={g.items.length} className="cell-title">
                        <span
                          className="title-hover"
                          onMouseEnter={(e) => {
                            if (r.has_cover && r.cover_url) {
                              setCoverHover({
                                src: r.cover_url,
                                alt: r.title,
                                rect: e.currentTarget.getBoundingClientRect(),
                              });
                            }
                          }}
                          onMouseLeave={() => setCoverHover(null)}
                        >
                          {r.title}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="edition-cell">{editionLabel(r)}</td>
                  <td className="cell-year">{displayYear(r)}</td>
                  <td>
                    {r.media_tags.map((t) => (
                      <span key={t} className="tag tag-media">
                        {t}
                      </span>
                    ))}
                  </td>
                  <td>
                    {r.animation_tags.length === 0 ? (
                      <span className="missing-label missing-label--animation">Missing</span>
                    ) : (
                      r.animation_tags.map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))
                    )}
                  </td>
                  <td>
                    {r.canvas_tags.length === 0 ? (
                      <span className="missing-label missing-label--canvas">Missing</span>
                    ) : (
                      r.canvas_tags.map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))
                    )}
                  </td>
                  <td className="autograph-cell">
                    {r.autograph_tags.length === 0 ? (
                      "—"
                    ) : (
                      r.autograph_tags.map((t) => (
                        <span
                          key={t}
                          className={`tag tag-autograph ${r.has_autograph_photo ? "has-photo" : ""}`}
                          onMouseEnter={(e) => {
                            if (r.has_autograph_photo && r.autograph_photo_url) {
                              setAutoHover({
                                src: `${r.autograph_photo_url}?v=${r.id}`,
                                alt: t,
                                rect: e.currentTarget.getBoundingClientRect(),
                              });
                            }
                          }}
                          onMouseLeave={() => setAutoHover(null)}
                        >
                          {t}
                        </span>
                      ))
                    )}
                  </td>
                  <td>
                    {r.pending ? (
                      <span className="tag tag-pending">{r.pending}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <HoverPreview
        src={coverHover?.src ?? ""}
        alt={coverHover?.alt ?? ""}
        anchorRect={coverHover?.rect ?? null}
        visible={!!coverHover}
      />
      <HoverPreview
        src={autoHover?.src ?? ""}
        alt={autoHover?.alt ?? ""}
        anchorRect={autoHover?.rect ?? null}
        visible={!!autoHover}
      />
    </>
  );
}
