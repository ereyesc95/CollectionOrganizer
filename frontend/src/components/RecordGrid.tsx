import { memo, useEffect, useMemo, useRef, useState } from "react";
import { browseAutographFile } from "../api";
import type { Record } from "../types";
import AutographStarIcon from "./AutographStarIcon";
import {
  albumKey,
  cardStatusClasses,
  displayYear,
  editionKey,
  editionLabel,
  isStandardEdition,
} from "../utils/recordDisplay";
import AutographPreviewBubble from "./AutographPreviewBubble";
import EditionDropdownPortal from "./EditionDropdownPortal";

interface Props {
  records: Record[];
  onSelect: (r: Record) => void;
  onRefresh?: () => void;
  onToast?: (msg: string, type: "success" | "error") => void;
}

const Card = memo(function Card({
  record: r,
  siblings,
  onEditionPick,
  onSelect,
  onRefresh,
  onToast,
}: {
  record: Record;
  siblings: Record[];
  onEditionPick: (id: number) => void;
  onSelect: (r: Record) => void;
  onRefresh?: () => void;
  onToast?: (msg: string, type: "success" | "error") => void;
}) {
  const [hover, setHover] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [editionOpen, setEditionOpen] = useState(false);
  const [autographOpen, setAutographOpen] = useState(false);
  const [autographAnchor, setAutographAnchor] = useState<DOMRect | null>(null);
  const [pickingAutograph, setPickingAutograph] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const editionAnchorRef = useRef<HTMLDivElement>(null);
  const autographBtnRef = useRef<HTMLButtonElement>(null);

  const hasEditionChoice = siblings.length > 1;
  const isSigned = r.autograph_tags.length > 0;

  useEffect(() => {
    setShowVideo(false);
    setHover(false);
  }, [r.id]);

  useEffect(() => {
    if (!showVideo) return;
    const v = videoRef.current;
    if (!v) return;
    const play = () => {
      v.currentTime = 0;
      v.play().catch(() => {});
    };
    if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) play();
    else v.addEventListener("loadeddata", play, { once: true });
    return () => v.removeEventListener("loadeddata", play);
  }, [showVideo, r.animation_url]);

  const onEnter = () => {
    setHover(true);
    if (r.has_animation_file && r.animation_url) setShowVideo(true);
  };

  const onLeave = () => {
    setHover(false);
    setShowVideo(false);
    setEditionOpen(false);
    setAutographOpen(false);
    setAutographAnchor(null);
  };

  const label = editionLabel(r);
  const hasMissing =
    !r.animation_tags.length || !r.canvas_tags.length || !!r.pending;

  return (
    <article
      className={`card ${cardStatusClasses(r)}`}
      onClick={() => onSelect(r)}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="card-img">
        {isSigned && (
          <button
            ref={autographBtnRef}
            type="button"
            className={`card-autograph-btn ${r.has_autograph_photo ? "has-photo" : "no-photo"}`}
            disabled={pickingAutograph}
            title={
              r.has_autograph_photo
                ? "Signed — click to preview autograph"
                : "Signed — no photo found, click to locate image"
            }
            aria-label={
              r.has_autograph_photo ? "Preview autograph" : "Find autograph photo"
            }
            onClick={async (e) => {
              e.stopPropagation();
              if (r.has_autograph_photo) {
                const rect = autographBtnRef.current?.getBoundingClientRect() ?? null;
                if (autographOpen) {
                  setAutographOpen(false);
                  setAutographAnchor(null);
                } else {
                  setAutographAnchor(rect);
                  setAutographOpen(true);
                }
                return;
              }
              setPickingAutograph(true);
              try {
                const result = await browseAutographFile(r.id);
                if (result.selected && result.has_photo) {
                  onToast?.("Autograph photo linked", "success");
                  onRefresh?.();
                }
              } catch (err) {
                onToast?.(
                  err instanceof Error ? err.message : "Could not open file picker",
                  "error"
                );
              } finally {
                setPickingAutograph(false);
              }
            }}
          >
            <AutographStarIcon />
          </button>
        )}
        {r.has_cover && r.cover_url ? (
          <img
            src={r.cover_url}
            alt={r.title}
            loading="lazy"
            decoding="async"
            className={showVideo ? "hidden" : ""}
          />
        ) : (
          !r.has_animation_file && <span className="placeholder">♪</span>
        )}
        {showVideo && r.animation_url && (
          <video
            ref={videoRef}
            src={r.animation_url}
            muted
            loop
            playsInline
            preload="none"
            className="visible"
          />
        )}
        <AutographPreviewBubble
          open={autographOpen}
          anchorRect={autographAnchor}
          photoSrc={
            r.has_autograph_photo && r.autograph_photo_url
              ? `${r.autograph_photo_url}?v=${r.id}`
              : null
          }
          tags={r.autograph_tags}
          ignoreRef={autographBtnRef}
          onClose={() => {
            setAutographOpen(false);
            setAutographAnchor(null);
          }}
        />
      </div>
      <div className="card-body">
        <div className="artist">{r.artist}</div>
        <div className="title">{r.title}</div>
        <div
          className={`edition-line ${hasEditionChoice ? "edition-dropdown-wrap" : ""}`}
          ref={editionAnchorRef}
          onClick={(e) => {
            if (hasEditionChoice) {
              e.stopPropagation();
              setEditionOpen((o) => !o);
            }
          }}
        >
          <span className={isStandardEdition(r) ? "edition-standard" : ""}>{label}</span>
          {hasEditionChoice && (
            <span className="edition-chevron" aria-hidden>
              ▾
            </span>
          )}
        </div>
        <EditionDropdownPortal
          open={editionOpen && hasEditionChoice}
          anchorRef={editionAnchorRef}
          siblings={siblings}
          currentId={r.id}
          onPick={(id) => {
            onEditionPick(id);
            setEditionOpen(false);
          }}
          onClose={() => setEditionOpen(false)}
        />
        <div className="year-line">{displayYear(r)}</div>
        <div className="card-media">
          {r.media_tags.map((t) => (
            <span key={t} className="tag tag-media">
              {t}
            </span>
          ))}
        </div>
      </div>
      {hover && (
        <div className="card-hover-bubble" onClick={(e) => e.stopPropagation()}>
          <strong>Details</strong>
          <div>Edition: {label}</div>
          <div>Year: {displayYear(r)}</div>
          {hasMissing ? (
            <ul>
              {!r.animation_tags.length && (
                <li className="missing-item missing-item--animation">No animation</li>
              )}
              {!r.canvas_tags.length && (
                <li className="missing-item missing-item--canvas">No canvas</li>
              )}
              {r.pending && (
                <li className="missing-item missing-item--pending">Pending: {r.pending}</li>
              )}
            </ul>
          ) : (
            <div className="bubble-ok">All set</div>
          )}
        </div>
      )}
    </article>
  );
});

export default function RecordGrid({ records, onSelect, onRefresh, onToast }: Props) {
  const byAlbum = useMemo(() => {
    const map = new Map<string, Record[]>();
    for (const r of records) {
      const k = albumKey(r);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    for (const items of map.values()) {
      items.sort((a, b) => {
        if (editionKey(a) === "standard") return -1;
        if (editionKey(b) === "standard") return 1;
        return editionLabel(a).localeCompare(editionLabel(b));
      });
    }
    return map;
  }, [records]);

  const [activeId, setActiveId] = useState<{ [album: string]: number }>({});

  if (!records.length) {
    return <div className="empty">No records match your filters.</div>;
  }

  return (
    <div className="grid">
      {Array.from(byAlbum.entries()).map(([ak, siblings]) => {
        const currentId = activeId[ak] ?? siblings[0].id;
        const current = siblings.find((s) => s.id === currentId) ?? siblings[0];
        return (
          <Card
            key={ak}
            record={current}
            siblings={siblings}
            onEditionPick={(id) => setActiveId((p) => ({ ...p, [ak]: id }))}
            onSelect={onSelect}
            onRefresh={onRefresh}
            onToast={onToast}
          />
        );
      })}
    </div>
  );
}
