import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import { browseAutographFile } from "../api";

import type { Record } from "../types";

import AutographIcon from "./AutographIcon";

import CardAlbumBack from "./CardAlbumBack";

import CardAssetIcons from "./CardAssetIcons";

import CardStatusDots from "./CardStatusDots";

import EditIcon from "./EditIcon";

import {

  albumKey,

  displayYear,

  editionKey,

  editionLabel,

  editionListLabel,

  isStandardEdition,

  mediaOnlyBackFallback,

} from "../utils/recordDisplay";

import { visibleCardAssets } from "../constants/cardAssets";

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

  flipped,

  onFlipChange,

  onEditionPick,

  onSelect,

  onRefresh,

  onToast,

}: {

  record: Record;

  siblings: Record[];

  flipped: boolean;

  onFlipChange: (open: boolean) => void;

  onEditionPick: (id: number) => void;

  onSelect: (r: Record) => void;

  onRefresh?: () => void;

  onToast?: (msg: string, type: "success" | "error") => void;

}) {

  const [hover, setHover] = useState(false);

  const [canvasEngaged, setCanvasEngaged] = useState(false);

  const [audioPlaying, setAudioPlaying] = useState(false);

  const [videoPlaying, setVideoPlaying] = useState(false);

  const [editionOpen, setEditionOpen] = useState(false);

  const [autographOpen, setAutographOpen] = useState(false);

  const [autographAnchor, setAutographAnchor] = useState<DOMRect | null>(null);

  const [pickingAutograph, setPickingAutograph] = useState(false);

  const [tracksStatus, setTracksStatus] = useState({ loading: true, hasTracks: false });

  const [pendingFlip, setPendingFlip] = useState(false);

  const [galleryOpen, setGalleryOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const canvasBgRef = useRef<HTMLVideoElement>(null);

  const editionAnchorRef = useRef<HTMLDivElement>(null);

  const autographBtnRef = useRef<HTMLButtonElement>(null);

  const hasEditionChoice = siblings.length > 1;

  const isSigned = r.autograph_tags.length > 0;



  useEffect(() => {

    setVideoPlaying(false);

    setHover(false);

    setCanvasEngaged(false);

    setAudioPlaying(false);

    setGalleryOpen(false);

  }, [r.id]);



  const canvasUrl = r.canvas_url ?? r.assets.canvas.url ?? null;

  const showCanvasBg =

    (r.has_canvas_file || r.assets.canvas.has_file) && !!canvasUrl;

  const animationUrl = r.animation_url ?? null;

  const coverUrl = r.cover_url ?? null;

  const mediaOnlyBack = useMemo(

    () => mediaOnlyBackFallback(r, canvasUrl, showCanvasBg),

    [r, canvasUrl, showCanvasBg]

  );



  useEffect(() => {

    setTracksStatus({ loading: true, hasTracks: false });

    setPendingFlip(false);

  }, [r.id]);



  useEffect(() => {

    if (!pendingFlip || tracksStatus.loading) return;

    if (tracksStatus.hasTracks || mediaOnlyBack) {

      onFlipChange(true);

      if (showCanvasBg) setCanvasEngaged(true);

      setVideoPlaying(false);

    }

    setPendingFlip(false);

  }, [pendingFlip, tracksStatus, mediaOnlyBack, onFlipChange, showCanvasBg]);



  useEffect(() => {

    if (flipped && !tracksStatus.loading && !tracksStatus.hasTracks && !mediaOnlyBack) {

      onFlipChange(false);

    }

  }, [flipped, tracksStatus, mediaOnlyBack, onFlipChange]);



  const frontEffectsActive = !flipped && (canvasEngaged || audioPlaying);

  const shouldPlayAnimation = frontEffectsActive && r.has_animation_file && !!r.animation_url;

  const shouldPlayCanvas = frontEffectsActive && showCanvasBg;



  useLayoutEffect(() => {

    if (!shouldPlayAnimation) {

      setVideoPlaying(false);

      return;

    }

    const v = videoRef.current;

    if (!v) return;

    const onPlaying = () => setVideoPlaying(true);

    const start = () => {

      v.currentTime = 0;

      void v.play().catch(() => {});

    };

    v.addEventListener("playing", onPlaying);

    if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) start();

    else {

      v.addEventListener("canplay", start, { once: true });

      void v.play().catch(() => {});

    }

    return () => {

      v.removeEventListener("playing", onPlaying);

      v.pause();

      v.currentTime = 0;

      setVideoPlaying(false);

    };

  }, [shouldPlayAnimation, r.animation_url]);



  const cardAssets = visibleCardAssets(r);

  const hasPendingDot = r.pending_tags.length > 0;

  const showActionsRow = cardAssets.length > 0 || isSigned || hasPendingDot;



  const playFrontCanvas = useCallback(() => {

    const cv = canvasBgRef.current;

    if (!cv) return;

    const start = () => {

      void cv.play().catch(() => {});

    };

    if (cv.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) start();

    else cv.addEventListener("canplay", start, { once: true });

  }, []);



  useLayoutEffect(() => {

    if (!shouldPlayCanvas || !canvasUrl) return;

    playFrontCanvas();

    return () => {

      const cv = canvasBgRef.current;

      if (cv && !audioPlaying) cv.pause();

    };

  }, [shouldPlayCanvas, canvasUrl, audioPlaying, playFrontCanvas]);



  const onEnter = () => {

    setHover(true);

    setCanvasEngaged(true);

  };



  const onLeave = () => {

    setHover(false);

    if (!audioPlaying) {

      setCanvasEngaged(false);

      setVideoPlaying(false);

    }

    setEditionOpen(false);

    setAutographOpen(false);

    setAutographAnchor(null);

  };



  const handleCardClick = useCallback(

    (e: MouseEvent) => {

      if (galleryOpen) return;

      if ((e.target as Element).closest(".card-album-back-interactive")) return;



      if (flipped) {

        onFlipChange(false);

        setCanvasEngaged(true);

        setHover(true);

        window.setTimeout(() => playFrontCanvas(), 580);

        return;

      }



      if (tracksStatus.hasTracks || mediaOnlyBack) {

        onFlipChange(true);

        if (showCanvasBg) setCanvasEngaged(true);

        setVideoPlaying(false);

        return;

      }



      if (tracksStatus.loading) {

        setPendingFlip(true);

        return;

      }

    },

    [flipped, onFlipChange, showCanvasBg, playFrontCanvas, tracksStatus, mediaOnlyBack, galleryOpen]

  );



  const label = editionListLabel(r);



  return (

    <article

      className={`card${flipped ? " card--flipped" : ""}`}

      onClick={handleCardClick}

      onMouseEnter={onEnter}

      onMouseLeave={onLeave}

    >

      <div className="card-flip-inner">

        <div className="card-flip-front">

          <div className="card-img">

            {r.has_cover && r.cover_url ? (

              <img

                src={r.cover_url}

                alt={r.title}

                loading="lazy"

                decoding="async"

                className={shouldPlayAnimation && videoPlaying ? "hidden" : ""}

              />

            ) : (

              !r.has_animation_file && <span className="placeholder">♪</span>

            )}

            {shouldPlayAnimation && (

              <video

                ref={videoRef}

                src={r.animation_url!}

                muted

                loop

                playsInline

                preload="auto"

                className={videoPlaying ? "visible" : ""}

              />

            )}

          </div>

          <div className={`card-body${shouldPlayCanvas ? " card-body--canvas-active" : ""}`}>

            {(canvasEngaged || audioPlaying) && showCanvasBg && canvasUrl && (

              <video

                ref={canvasBgRef}

                className={`card-body-canvas-bg${flipped ? " card-body-canvas-bg--off" : ""}`}

                src={canvasUrl}

                muted

                loop

                playsInline

                preload="metadata"

                aria-hidden

              />

            )}

            <div className="card-body-scrim" aria-hidden />

            <div className="card-body-top">

              <div

                className={`card-album-title${r.title.length > 30 ? " is-long" : ""}`}

                title={r.title}

              >

                {r.title}

              </div>

              <div

                className={`card-album-artist${r.artist.length > 30 ? " is-long" : ""}`}

                title={r.artist}

              >

                {r.artist}

              </div>

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

            </div>

            <div className="card-body-spacer" aria-hidden />

            <div className="card-body-footer">

              <div className="card-media">

                {r.media_tags.map((t) => (

                  <span key={t} className="tag tag-media">

                    {t}

                  </span>

                ))}

              </div>

              <div className="card-body-actions-row">

                <div className="card-body-actions-left">

                  {showActionsRow && <CardAssetIcons record={r} />}

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

                      <AutographIcon />

                    </button>

                  )}

                </div>

                <div className="card-body-actions-right">

                  {hasPendingDot && <CardStatusDots record={r} />}

                  <button

                    type="button"

                    className="card-edit-btn"

                    title="Edit record"

                    aria-label="Edit record"

                    onClick={(e) => {

                      e.stopPropagation();

                      onSelect(r);

                    }}

                  >

                    <EditIcon />

                  </button>

                </div>

              </div>

            </div>

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

        </div>

        <div className="card-flip-back">

          <CardAlbumBack

            record={r}

            siblings={siblings}

            onEditionPick={onEditionPick}

            onPlayingChange={setAudioPlaying}

            onTracksStatus={setTracksStatus}

            onGalleryOpenChange={setGalleryOpen}

            canvasUrl={canvasUrl}

            showCanvas={showCanvasBg}

            animationUrl={animationUrl}

            coverUrl={coverUrl}

          />

        </div>

      </div>

      {hover && !flipped && (

        <div className="card-hover-bubble" onClick={(e) => e.stopPropagation()}>

          <strong>Details</strong>

          <div>Edition: {label || "—"}</div>

          <div>Year: {displayYear(r)}</div>

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

  const [flippedId, setFlippedId] = useState<number | null>(null);



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

            flipped={flippedId !== null && siblings.some((s) => s.id === flippedId)}

            onFlipChange={(open) => setFlippedId(open ? current.id : null)}

            onEditionPick={(id) => {

              setActiveId((p) => ({ ...p, [ak]: id }));

              setFlippedId((prev) => {
                if (prev !== null && siblings.some((s) => s.id === prev)) return id;
                return prev;
              });

            }}

            onSelect={onSelect}

            onRefresh={onRefresh}

            onToast={onToast}

          />

        );

      })}

    </div>

  );

}


