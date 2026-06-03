import { useRef } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPreviewPosition } from "../hooks/useAnchoredPreviewPosition";

interface Props {
  src: string;
  alt: string;
  anchorRect: DOMRect | null;
  visible: boolean;
  kind?: "image" | "video";
}

export default function MediaHoverPreview({
  src,
  alt,
  anchorRect,
  visible,
  kind = "image",
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const position = useAnchoredPreviewPosition(anchorRect, visible && !!src, boxRef);

  if (!visible || !anchorRect || !src) return null;

  return createPortal(
    <div
      ref={boxRef}
      className={`hover-preview hover-preview--fit${kind === "video" ? " hover-preview--video" : ""}`}
      style={position}
    >
      {kind === "video" ? (
        <video src={src} autoPlay muted loop playsInline />
      ) : (
        <img src={src} alt={alt} />
      )}
    </div>,
    document.body
  );
}
