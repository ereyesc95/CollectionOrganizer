import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FlipCardAssets, MediaSide } from "../types";
import { fitMediaSize } from "../utils/previewLayout";

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

type Measured = { width: number; height: number };

function MediaFace({
  side,
  alt,
  maxW,
  maxH,
  onMeasured,
}: {
  side: MediaSide;
  alt: string;
  maxW: number;
  maxH: number;
  onMeasured: (size: Measured) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const reportSize = useCallback(
    (nw: number, nh: number) => {
      if (nw > 0 && nh > 0) onMeasured(fitMediaSize(nw, nh, maxW, maxH));
    },
    [maxW, maxH, onMeasured]
  );

  useLayoutEffect(() => {
    if (!side.has_file || !side.url) return;
    if (isVideoUrl(side.url)) {
      const v = videoRef.current;
      if (v && v.readyState >= HTMLMediaElement.HAVE_METADATA) {
        reportSize(v.videoWidth, v.videoHeight);
      }
      return;
    }
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      reportSize(img.naturalWidth, img.naturalHeight);
    }
  }, [side.url, side.has_file, reportSize]);

  if (!side.has_file || !side.url) {
    return <span className="flip-card-empty">No file</span>;
  }

  if (isVideoUrl(side.url)) {
    return (
      <video
        key={side.url}
        ref={videoRef}
        src={side.url}
        autoPlay
        muted
        loop
        playsInline
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          reportSize(v.videoWidth, v.videoHeight);
        }}
      />
    );
  }

  return (
    <img
      key={side.url}
      ref={imgRef}
      src={side.url}
      alt={alt}
      onLoad={(e) => reportSize(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
    />
  );
}

interface Props {
  assets: FlipCardAssets;
  title: string;
  orientation?: "portrait" | "landscape" | "auto";
  maxWidth?: number;
  maxHeight?: number;
}

const BOUNDS = {
  portrait: { w: 300, h: 440 },
  landscape: { w: 400, h: 280 },
  auto: { w: 300, h: 440 },
};

export default function FlipCardStage({
  assets,
  title,
  orientation = "auto",
  maxWidth,
  maxHeight,
}: Props) {
  const [flipped, setFlipped] = useState(false);
  const [frontSize, setFrontSize] = useState<Measured | null>(null);
  const [backSize, setBackSize] = useState<Measured | null>(null);
  const front = assets.front;
  const back = assets.back;
  const canFlip = front.has_file && back.has_file;
  const orient = orientation === "auto" ? "auto" : orientation;
  const bounds = BOUNDS[orient];
  const maxW = maxWidth ?? bounds.w;
  const maxH = maxHeight ?? bounds.h;
  const activeSize = (flipped && canFlip ? backSize : frontSize) ?? frontSize ?? backSize;

  useEffect(() => {
    setFlipped(false);
    setFrontSize(null);
    setBackSize(null);
  }, [assets.front.url, assets.back.url]);

  const onStageClick = () => {
    if (!canFlip) return;
    setFlipped((f) => !f);
  };

  const innerStyle = activeSize
    ? { width: activeSize.width, height: activeSize.height }
    : undefined;

  return (
    <div
      className={`flip-card-stage flip-card-stage--${orient}${canFlip ? " flip-card-stage--clickable" : ""}`}
      onClick={onStageClick}
      role={canFlip ? "button" : undefined}
      tabIndex={canFlip ? 0 : undefined}
      onKeyDown={(e) => {
        if (canFlip && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setFlipped((f) => !f);
        }
      }}
      title={canFlip ? "Click to flip" : undefined}
    >
      <div
        className={`flip-card-inner${flipped && canFlip ? " is-flipped" : ""}${
          !activeSize ? " is-loading" : ""
        }`}
        style={innerStyle}
      >
        <div className="flip-card-face flip-card-face--front">
          <MediaFace
            side={front}
            alt={`${title} front`}
            maxW={maxW}
            maxH={maxH}
            onMeasured={setFrontSize}
          />
        </div>
        {canFlip && (
          <div className="flip-card-face flip-card-face--back">
            <MediaFace
              side={back}
              alt={`${title} back`}
              maxW={maxW}
              maxH={maxH}
              onMeasured={setBackSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}
