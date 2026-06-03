import { useRef } from "react";
import { createPortal } from "react-dom";
import { useAnchoredPreviewPosition } from "../hooks/useAnchoredPreviewPosition";

interface Props {
  src: string;
  alt: string;
  anchorRect: DOMRect | null;
  visible: boolean;
}

export default function HoverPreview({ src, alt, anchorRect, visible }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const position = useAnchoredPreviewPosition(anchorRect, visible && !!src, boxRef);

  if (!visible || !anchorRect || !src) return null;

  return createPortal(
    <div ref={boxRef} className="hover-preview hover-preview--fit" style={position}>
      <img src={src} alt={alt} />
    </div>,
    document.body
  );
}
