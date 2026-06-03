import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Record } from "../types";
import {
  animationMediaUrl,
  canvasMediaUrl,
  indexedMediaHasFile,
} from "../utils/mediaUrls";
import {
  albumKey,
  editionLabel,
  editionListLabel,
  displayRecordYear,
  isStandardEdition,
  sourceTagClass,
  storedPendingTags,
} from "../utils/recordDisplay";
import {
  CARD_ASSET_CONFIGS,
  cardAssetHasFile,
  cardAssetShouldShow,
  cardPreviewLayout,
  flipAssets,
  spotifyCardConfig,
} from "../constants/cardAssets";
import { pendingManyTags } from "../constants/pendingTags";
import CountryFlag from "./CountryFlag";
import { updateRecord } from "../api";
import CardFlipHoverPreview from "./CardFlipHoverPreview";
import FlipAssetPreview from "./FlipAssetPreview";
import MediaHoverPreview from "./MediaHoverPreview";
import HoverPreview from "./HoverPreview";
import RemovableTag from "./RemovableTag";

interface Props {
  records: Record[];
  onSelect: (r: Record) => void;
  onRefresh?: () => void;
  onToast?: (msg: string, type: "success" | "error") => void;
}

type SortField =
  | "artist"
  | "title"
  | "edition"
  | "year"
  | "release_type"
  | "genre"
  | "media"
  | "animation"
  | "canvas"
  | "autographs"
  | "pending";

type AlbumGroup = { key: string; items: Record[] };

const COLS: { id: SortField; label: string; resizable: boolean }[] = [
  { id: "title", label: "Title", resizable: true },
  { id: "artist", label: "Artist", resizable: true },
  { id: "edition", label: "Edition", resizable: true },
  { id: "year", label: "Year", resizable: true },
  { id: "release_type", label: "Type", resizable: true },
  { id: "genre", label: "Genre", resizable: true },
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
  release_type: 110,
  genre: 120,
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
      return displayRecordYear(r) === "????" ? 0 : parseInt(displayRecordYear(r), 10) || 0;
    case "release_type":
      return (r.release_type ?? "").toLowerCase();
    case "genre":
      return r.genre_tags.join(",").toLowerCase();
    case "media":
      return r.media_tags.join(",").toLowerCase();
    case "animation":
      return r.animation_tags.join(",").toLowerCase();
    case "canvas":
      return r.canvas_tags.join(",").toLowerCase();
    case "autographs":
      return r.autograph_tags.join(",").toLowerCase();
    case "pending":
      return r.pending_tags.join(",").toLowerCase();
    default:
      return "";
  }
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function buildGroups(records: Record[]): AlbumGroup[] {
  const map = new Map<string, Record[]>();
  for (const r of records) {
    const key = albumKey(r);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  for (const items of map.values()) {
    items.sort((a, b) => {
      if (isStandardEdition(a)) return -1;
      if (isStandardEdition(b)) return 1;
      return editionLabel(a).localeCompare(editionLabel(b));
    });
  }
  return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
}

const PORTRAIT_CFG = CARD_ASSET_CONFIGS.find((c) => c.kind === "portrait")!;
const LANDSCAPE_CFG = CARD_ASSET_CONFIGS.find((c) => c.kind === "landscape")!;

function cardsHoverEligible(record: Record): boolean {
  return cardAssetShouldShow(record, PORTRAIT_CFG) || cardAssetShouldShow(record, LANDSCAPE_CFG);
}

function groupCardsEligible(items: Record[]): boolean {
  return items.some(cardsHoverEligible);
}

function artistCardsHaveFiles(record: Record): boolean {
  return (
    cardAssetHasFile(record.assets, "portrait") || cardAssetHasFile(record.assets, "landscape")
  );
}

function editionWithArtistCardFiles(items: Record[]): Record {
  return items.find(artistCardsHaveFiles) ?? items[0];
}

function keyboardScrollBlocked(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement
  ) {
    return true;
  }
  if (!(active instanceof HTMLElement)) return false;
  if (active.isContentEditable) return true;
  return !!active.closest(
    ".modal-overlay, .sidebar, .flip-asset-preview, .artwork-gallery-overlay"
  );
}

export default function RecordTable({ records, onSelect, onRefresh, onToast }: Props) {
  const [removingTag, setRemovingTag] = useState<string | null>(null);
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
  const [mediaHover, setMediaHover] = useState<{
    src: string;
    alt: string;
    rect: DOMRect;
    kind: "image" | "video";
  } | null>(null);
  const [cardHover, setCardHover] = useState<{
    record: Record;
    editions: Record[];
    rect: DOMRect;
    session: number;
  } | null>(null);
  const cardHoverSession = useRef(0);
  const [spotifyPreview, setSpotifyPreview] = useState<{
    record: Record;
    rect: DOMRect;
  } | null>(null);
  const spotifyBtnRef = useRef<HTMLButtonElement | null>(null);
  const cardHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardHoverPinned = useRef(false);
  const cardHoverAnchorRef = useRef<HTMLElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  const removeListTag = useCallback(
    async (record: Record, field: "genre_tags" | "pending_tags", tag: string) => {
      const key = `${record.id}:${field}:${tag}`;
      if (removingTag === key) return;
      setRemovingTag(key);
      try {
        const current =
          field === "genre_tags" ? record.genre_tags : storedPendingTags(record);
        const next = current.filter((t) => t !== tag);
        await updateRecord(record.id, { [field]: next });
        onRefresh?.();
      } catch (e) {
        onToast?.(e instanceof Error ? e.message : "Could not remove tag", "error");
      } finally {
        setRemovingTag(null);
      }
    },
    [removingTag, onRefresh, onToast]
  );

  const cancelCardHoverClear = () => {
    if (cardHoverTimer.current) {
      clearTimeout(cardHoverTimer.current);
      cardHoverTimer.current = null;
    }
  };

  const scheduleCardHoverClear = () => {
    cancelCardHoverClear();
    cardHoverTimer.current = setTimeout(() => {
      if (!cardHoverPinned.current) {
        setCardHover(null);
        cardHoverAnchorRef.current = null;
      }
    }, 320);
  };

  const syncCardHoverAnchor = useCallback(() => {
    const anchor = cardHoverAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setCardHover((prev) => (prev ? { ...prev, rect } : null));
  }, []);

  const dismissCardHover = () => {
    cancelCardHoverClear();
    cardHoverPinned.current = false;
    setCardHover(null);
    cardHoverAnchorRef.current = null;
  };

  const openArtistCardHover = (g: AlbumGroup, anchor: HTMLElement) => {
    cancelCardHoverClear();
    cardHoverPinned.current = false;
    setSpotifyPreview(null);
    setCoverHover(null);
    if (!groupCardsEligible(g.items)) {
      dismissCardHover();
      return;
    }
    cardHoverAnchorRef.current = anchor;
    const rect = anchor.getBoundingClientRect();
    const record = editionWithArtistCardFiles(g.items);
    cardHoverSession.current += 1;
    setCardHover({
      record,
      editions: g.items,
      rect,
      session: cardHoverSession.current,
    });
  };

  useEffect(() => {
    if (!cardHover) return;
    const scroller = tableScrollRef.current;
    scroller?.addEventListener("scroll", syncCardHoverAnchor, { passive: true });
    window.addEventListener("resize", syncCardHoverAnchor);
    return () => {
      scroller?.removeEventListener("scroll", syncCardHoverAnchor);
      window.removeEventListener("resize", syncCardHoverAnchor);
    };
  }, [cardHover, syncCardHoverAnchor]);

  useEffect(() => {
    const LINE = 48;
    const onKeyDown = (e: KeyboardEvent) => {
      const scroller = tableScrollRef.current;
      if (!scroller || keyboardScrollBlocked()) return;

      let delta = 0;
      switch (e.key) {
        case "ArrowDown":
          delta = LINE;
          break;
        case "ArrowUp":
          delta = -LINE;
          break;
        case "PageDown":
          delta = scroller.clientHeight * 0.85;
          break;
        case "PageUp":
          delta = -scroller.clientHeight * 0.85;
          break;
        case "Home":
          if (e.ctrlKey || e.metaKey) {
            scroller.scrollTop = 0;
            e.preventDefault();
          }
          return;
        case "End":
          if (e.ctrlKey || e.metaKey) {
            scroller.scrollTop = scroller.scrollHeight;
            e.preventDefault();
          }
          return;
        default:
          return;
      }

      e.preventDefault();
      scroller.scrollBy({ top: delta });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
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
      <div
        className="table-scroll"
        ref={tableScrollRef}
        tabIndex={-1}
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.closest(
              "button, input, select, textarea, a, .th-sortable, .col-resizer"
            )
          ) {
            return;
          }
          tableScrollRef.current?.focus({ preventScroll: true });
        }}
      >
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
                      <td rowSpan={g.items.length} className="cell-title">
                        <span className="cell-title-text">{r.title}</span>
                        {g.items.length > 1 && (
                          <span className="album-versions">{g.items.length} editions</span>
                        )}
                      </td>
                      <td
                        rowSpan={g.items.length}
                        className="cell-artist cell-artist-cards"
                      >
                        <span className="cell-artist-inner">
                          {r.country_tags[0] && (
                            <CountryFlag
                              name={r.country_tags[0]}
                              className="artist-flag"
                              title={r.country_tags[0]}
                            />
                          )}
                          <span
                            className="artist-name-cards"
                            onMouseEnter={(e) => openArtistCardHover(g, e.currentTarget)}
                            onMouseLeave={scheduleCardHoverClear}
                          >
                            {r.artist}
                          </span>
                        </span>
                      </td>
                    </>
                  )}
                  <td className="edition-cell">
                    <span className="edition-cell-row">
                      {cardAssetShouldShow(r, spotifyCardConfig()) && (
                        <button
                          type="button"
                          className={`list-spotify-btn ${
                            cardAssetHasFile(r.assets, "spotify") ? "has-file" : "no-file"
                          }`}
                          title={
                            cardAssetHasFile(r.assets, "spotify")
                              ? "Spotify card — click to preview"
                              : "Spotify card — file not found"
                          }
                          aria-label="Spotify card"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!cardAssetHasFile(r.assets, "spotify")) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            dismissCardHover();
                            if (
                              spotifyPreview?.record.id === r.id &&
                              spotifyPreview.rect.top === rect.top
                            ) {
                              setSpotifyPreview(null);
                            } else {
                              spotifyBtnRef.current = e.currentTarget;
                              setSpotifyPreview({ record: r, rect });
                            }
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
                            <path
                              d="M8 10.5c2.5-1 5.5-1 8 0M7.5 13c3-1 6-1 9 0M7 15.5c3.5-1 7-1 10 0"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              fill="none"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      )}
                      <span
                        className="edition-label edition-cover-hover"
                        title={r.has_cover ? "Hover for cover" : undefined}
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
                        {editionListLabel(r) || "—"}
                        {r.edition_year != null && (
                          <span className="edition-year-suffix"> ({r.edition_year})</span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="cell-year">{displayRecordYear(r)}</td>
                  <td>
                    {r.release_type ? (
                      <span className="tag tag-type">{r.release_type}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={r.genre_tags.length > 4 ? "cell-genre-many" : undefined}>
                    {r.genre_tags.length === 0
                      ? "—"
                      : r.genre_tags.map((t) => (
                          <RemovableTag
                            key={t}
                            label={t}
                            className="tag-genre"
                            busy={removingTag === `${r.id}:genre_tags:${t}`}
                            onRemove={() => void removeListTag(r, "genre_tags", t)}
                          />
                        ))}
                  </td>
                  <td>
                    {r.media_tags.map((t) => (
                      <span key={t} className="tag tag-media">
                        {t}
                      </span>
                    ))}
                  </td>
                  <td>
                    {r.animation_tags.length === 0
                      ? "—"
                      : r.animation_tags.map((t, i) => {
                          const hasFile = indexedMediaHasFile(
                            r.animation_files,
                            i,
                            r.has_animation_file
                          );
                          return (
                          <span
                            key={`${t}-${i}`}
                            className={sourceTagClass(true, hasFile)}
                            onMouseEnter={(e) => {
                              if (hasFile) {
                                setMediaHover({
                                  src: animationMediaUrl(r.id, i + 1),
                                  alt: t,
                                  rect: e.currentTarget.getBoundingClientRect(),
                                  kind: "video",
                                });
                              }
                            }}
                            onMouseLeave={() => setMediaHover(null)}
                          >
                            {t}
                          </span>
                          );
                        })}
                  </td>
                  <td>
                    {r.canvas_tags.length === 0
                      ? "—"
                      : r.canvas_tags.map((t, i) => {
                          const hasFile = indexedMediaHasFile(
                            r.canvas_files,
                            i,
                            r.has_canvas_file
                          );
                          return (
                          <span
                            key={`${t}-${i}`}
                            className={sourceTagClass(true, hasFile)}
                            onMouseEnter={(e) => {
                              if (hasFile) {
                                setMediaHover({
                                  src: canvasMediaUrl(r.id, i + 1),
                                  alt: t,
                                  rect: e.currentTarget.getBoundingClientRect(),
                                  kind: "video",
                                });
                              }
                            }}
                            onMouseLeave={() => setMediaHover(null)}
                          >
                            {t}
                          </span>
                          );
                        })}
                  </td>
                  <td className="autograph-cell">
                    {r.autograph_tags.length === 0 ? (
                      "—"
                    ) : (
                      r.autograph_tags.map((t) => (
                        <span
                          key={t}
                          className={`${sourceTagClass(true, r.has_autograph_photo)} tag-autograph`}
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
                  <td
                    className={
                      pendingManyTags(r.pending_tags.length) ? "cell-pending-many" : undefined
                    }
                  >
                    {r.pending_tags.length === 0
                      ? "—"
                      : r.pending_tags.map((t) => (
                          <RemovableTag
                            key={t}
                            label={t}
                            className="tag-pending"
                            removable={t !== "Animation" && t !== "Canvas"}
                            busy={removingTag === `${r.id}:pending_tags:${t}`}
                            onRemove={() => void removeListTag(r, "pending_tags", t)}
                          />
                        ))}
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
      <MediaHoverPreview
        src={mediaHover?.src ?? ""}
        alt={mediaHover?.alt ?? ""}
        anchorRect={mediaHover?.rect ?? null}
        visible={!!mediaHover}
        kind={mediaHover?.kind ?? "image"}
      />
      <CardFlipHoverPreview
        key={cardHover ? `cards-${cardHover.session}` : "cards-closed"}
        record={cardHover?.record ?? null}
        editions={cardHover?.editions}
        anchorRect={cardHover?.rect ?? null}
        visible={!!cardHover && artistCardsHaveFiles(cardHover.record)}
        onSelectEdition={(id) => {
          setCardHover((prev) => {
            if (!prev) return prev;
            const next = prev.editions.find((e) => e.id === id);
            return next ? { ...prev, record: next } : prev;
          });
        }}
        onPreviewEnter={() => {
          cardHoverPinned.current = true;
          cancelCardHoverClear();
        }}
        onPreviewLeave={() => {
          cardHoverPinned.current = false;
          scheduleCardHoverClear();
        }}
      />
      <FlipAssetPreview
        open={!!spotifyPreview}
        anchorRect={spotifyPreview?.rect ?? null}
        assets={
          spotifyPreview ? flipAssets(spotifyPreview.record.assets, "spotify") : { front: { has_file: false, url: null }, back: { has_file: false, url: null } }
        }
        title="Spotify card"
        layout={cardPreviewLayout("spotify", "list")}
        ignoreRef={spotifyBtnRef}
        onClose={() => setSpotifyPreview(null)}
      />
    </>
  );
}
