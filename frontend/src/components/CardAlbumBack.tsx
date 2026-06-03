import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { fetchArtwork, fetchAudioTracks } from "../api";
import type { ArtworkImage, AudioTrack, Record } from "../types";
import { editionLabel, isStandardEdition, mediaOnlyBackFallback, type MediaOnlyBackMode } from "../utils/recordDisplay";
import ArtworkGalleryModal from "./ArtworkGalleryModal";
import ArtworkIcon from "./ArtworkIcon";
import EditionDropdownPortal from "./EditionDropdownPortal";
import MarqueeText from "./MarqueeText";
import { IconNext, IconPause, IconPlay, IconPrev } from "./PlayerIcons";

interface Props {
  record: Record;
  siblings: Record[];
  onEditionPick: (id: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  onTracksStatus?: (status: { loading: boolean; hasTracks: boolean }) => void;
  onGalleryOpenChange?: (open: boolean) => void;
  canvasUrl: string | null;
  showCanvas: boolean;
  animationUrl: string | null;
  coverUrl: string | null;
}

function formatTrackNumber(t: AudioTrack): string {
  if (t.track_number) return t.track_number.padStart(2, "0");
  return String(t.index + 1).padStart(2, "0");
}

function stopBubble(e: MouseEvent) {
  e.stopPropagation();
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

export default function CardAlbumBack({
  record,
  siblings,
  onEditionPick,
  onPlayingChange,
  onTracksStatus,
  onGalleryOpenChange,
  canvasUrl,
  showCanvas,
  animationUrl,
  coverUrl,
}: Props) {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [artwork, setArtwork] = useState<ArtworkImage[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [seekPct, setSeekPct] = useState(0);
  const [editionOpen, setEditionOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const editionAnchorRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const hasEditionChoice = siblings.length > 1;
  const label = editionLabel(record);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTracks([]);
    setActiveIndex(null);
    setPlaying(false);
    setSeekPct(0);
    void fetchAudioTracks(record.id)
      .then((res) => {
        if (cancelled) return;
        setTracks(res.tracks);
      })
      .catch(() => {
        if (cancelled) return;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    void fetchArtwork(record.id)
      .then((res) => {
        if (!cancelled) setArtwork(res.images);
      })
      .catch(() => {
        if (!cancelled) setArtwork([]);
      });
    return () => {
      cancelled = true;
    };
  }, [record.id]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
    }
    setActiveIndex(null);
    setPlaying(false);
    setSeekPct(0);
    setArtwork([]);
    setGalleryOpen(false);
  }, [record.id]);

  useEffect(() => {
    onTracksStatus?.({ loading, hasTracks: tracks.length > 0 });
  }, [loading, tracks.length, onTracksStatus]);

  useEffect(() => {
    onGalleryOpenChange?.(galleryOpen);
  }, [galleryOpen, onGalleryOpenChange]);

  const showTracklistUi = !loading && tracks.length > 0;

  const mediaOnlyMode = useMemo((): MediaOnlyBackMode | null => {
    if (showTracklistUi) return null;
    return mediaOnlyBackFallback(record, canvasUrl, showCanvas);
  }, [showTracklistUi, record, canvasUrl, showCanvas]);

  const portraitCardBackUrl =
    record.assets.portrait_card.back.has_file && record.assets.portrait_card.back.url
      ? record.assets.portrait_card.back.url
      : null;

  const backVideoSrc = useMemo(() => {
    if (showTracklistUi) return showCanvas && canvasUrl ? canvasUrl : null;
    if (mediaOnlyMode === "canvas") return canvasUrl;
    if (mediaOnlyMode === "animation") return animationUrl;
    if (mediaOnlyMode === "portrait_card" && portraitCardBackUrl && isVideoUrl(portraitCardBackUrl)) {
      return portraitCardBackUrl;
    }
    return null;
  }, [showTracklistUi, showCanvas, canvasUrl, mediaOnlyMode, animationUrl, portraitCardBackUrl]);

  useEffect(() => {
    if (!backVideoSrc) return;
    const cv = videoRef.current;
    if (!cv) return;
    const start = () => {
      cv.currentTime = 0;
      void cv.play().catch(() => {});
    };
    if (cv.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) start();
    else {
      cv.addEventListener("canplay", start, { once: true });
      void cv.play().catch(() => {});
    }
    return () => {
      cv.pause();
      cv.currentTime = 0;
    };
  }, [backVideoSrc, record.id]);

  const playTrack = useCallback(
    (index: number) => {
      const track = tracks[index];
      if (!track) return;
      const a = audioRef.current;
      if (!a) return;
      setActiveIndex(index);
      const url = track.url;
      if (a.getAttribute("src") !== url) {
        a.src = url;
      }
      void a.play().catch(() => {});
    },
    [tracks]
  );

  const goPrev = useCallback(() => {
    if (activeIndex == null || activeIndex <= 0) return;
    playTrack(activeIndex - 1);
  }, [activeIndex, playTrack]);

  const goNext = useCallback(() => {
    if (activeIndex == null || activeIndex >= tracks.length - 1) return;
    playTrack(activeIndex + 1);
  }, [activeIndex, tracks.length, playTrack]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => {
      setPlaying(true);
      onPlayingChange?.(true);
    };
    const onPause = () => {
      setPlaying(false);
      onPlayingChange?.(false);
    };
    const onTime = () => {
      if (!Number.isFinite(a.duration) || a.duration <= 0) {
        setSeekPct(0);
        return;
      }
      setSeekPct((a.currentTime / a.duration) * 100);
    };
    const onEnded = () => {
      if (activeIndex == null || activeIndex >= tracks.length - 1) {
        setPlaying(false);
        onPlayingChange?.(false);
        return;
      }
      playTrack(activeIndex + 1);
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
    };
  }, [activeIndex, tracks.length, playTrack, onPlayingChange]);

  const activeTrack = activeIndex != null ? tracks[activeIndex] : null;
  const nowPlayingLabel = activeTrack ? activeTrack.title : "Select a track";

  const multiDisc = useMemo(() => {
    const names = new Set(tracks.map((t) => t.disc).filter(Boolean));
    return names.size > 1;
  }, [tracks]);

  const trackRows = useMemo(() => {
    if (!tracks.length) return [];
    let lastDisc: string | null = null;
    return tracks.map((t) => {
      const showDiscHeader = multiDisc && !!t.disc && t.disc !== lastDisc;
      if (showDiscHeader && t.disc) lastDisc = t.disc;
      return { track: t, showDiscHeader, discLabel: t.disc };
    });
  }, [tracks, multiDisc]);

  return (
    <div
      ref={backRef}
      className={`card-album-back${showTracklistUi ? "" : " card-album-back--media-only"}`}
    >
      {backVideoSrc && (
        <video
          ref={videoRef}
          className={`${showTracklistUi ? "card-album-back-canvas" : "card-album-back-media"}${!showTracklistUi && mediaOnlyMode === "portrait_card" ? " card-album-back-media--card" : ""}`}
          src={backVideoSrc}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        />
      )}
      {!showTracklistUi && mediaOnlyMode === "portrait_card" && portraitCardBackUrl && !isVideoUrl(portraitCardBackUrl) && (
        <img className="card-album-back-media card-album-back-media--card" src={portraitCardBackUrl} alt="" aria-hidden />
      )}
      {!showTracklistUi && mediaOnlyMode === "cover" && coverUrl && (
        <img className="card-album-back-media" src={coverUrl} alt="" aria-hidden />
      )}
      {showTracklistUi && (
        <>
      <div className="card-album-back-scrim" aria-hidden />
      {artwork.length > 0 && (
        <button
          type="button"
          className="card-album-back-artwork-btn card-album-back-interactive"
          title="View artwork scans"
          aria-label="View artwork scans"
          onClick={(e) => {
            stopBubble(e);
            setGalleryOpen(true);
          }}
        >
          <ArtworkIcon />
        </button>
      )}
      <div
        className={`card-album-back-header${artwork.length > 0 ? " card-album-back-header--has-artwork" : ""}`}
      >
        <MarqueeText text={record.title} className="card-album-back-title" />
        <div
          ref={editionAnchorRef}
          className={`card-album-back-meta${hasEditionChoice ? " card-album-back-meta--picker card-album-back-interactive" : ""}`}
          onClick={(e) => {
            if (!hasEditionChoice) return;
            stopBubble(e);
            setEditionOpen((o) => !o);
          }}
        >
          <span className={isStandardEdition(record) ? "edition-standard" : ""}>{label}</span>
          {hasEditionChoice && (
            <span className="edition-chevron card-album-back-edition-chevron" aria-hidden>
              ▾
            </span>
          )}
        </div>
        <EditionDropdownPortal
          open={editionOpen && hasEditionChoice}
          anchorRef={editionAnchorRef}
          siblings={siblings}
          currentId={record.id}
          onPick={(id) => {
            onEditionPick(id);
            setEditionOpen(false);
          }}
          onClose={() => setEditionOpen(false)}
        />
      </div>
      <div className="card-album-back-tracks" role="list">
        {trackRows.map(({ track: t, showDiscHeader, discLabel }) => (
            <div key={t.index}>
              {showDiscHeader && discLabel && (
                <div className="card-album-back-disc-header">{discLabel}</div>
              )}
              <button
                type="button"
                role="listitem"
                className={`card-album-back-track card-album-back-interactive${activeIndex === t.index ? " is-active" : ""}`}
                onClick={(e) => {
                  stopBubble(e);
                  playTrack(t.index);
                }}
              >
                <span className="card-album-back-track-num">{formatTrackNumber(t)}</span>
                {activeIndex === t.index ? (
                  <MarqueeText text={t.title} className="card-album-back-track-title" />
                ) : (
                  <span className="card-album-back-track-title card-album-back-track-title--static">
                    {t.title}
                  </span>
                )}
              </button>
            </div>
          ))}
      </div>
      <div className="card-album-back-player card-album-back-interactive" onClick={stopBubble}>
        <audio ref={audioRef} preload="metadata" />
        <div className="card-album-back-player-controls">
          <button
            type="button"
            className="card-album-back-ctrl"
            disabled={activeIndex == null || activeIndex <= 0}
            aria-label="Previous track"
            onClick={goPrev}
          >
            <IconPrev />
          </button>
          <button
            type="button"
            className="card-album-back-ctrl card-album-back-ctrl--main"
            disabled={!activeTrack}
            aria-label={playing ? "Pause" : "Play"}
            onClick={() => {
              const a = audioRef.current;
              if (!a || !activeTrack) return;
              if (a.paused) void a.play().catch(() => {});
              else a.pause();
            }}
          >
            {playing ? <IconPause /> : <IconPlay />}
          </button>
          <button
            type="button"
            className="card-album-back-ctrl"
            disabled={activeIndex == null || activeIndex >= tracks.length - 1}
            aria-label="Next track"
            onClick={goNext}
          >
            <IconNext />
          </button>
        </div>
        <MarqueeText
          text={nowPlayingLabel}
          className="card-album-back-now-playing card-album-back-now-playing--centered"
        />
        <div className="card-album-back-seek-wrap">
          <input
            type="range"
            className="card-album-back-seek"
            min={0}
            max={100}
            step={0.1}
            value={seekPct}
            disabled={!activeTrack}
            onChange={(e) => {
              const a = audioRef.current;
              if (!a || !Number.isFinite(a.duration)) return;
              const pct = Number(e.target.value);
              setSeekPct(pct);
              a.currentTime = (pct / 100) * a.duration;
            }}
          />
        </div>
      </div>
        </>
      )}
      <ArtworkGalleryModal open={galleryOpen} images={artwork} onClose={() => setGalleryOpen(false)} />
    </div>
  );
}
