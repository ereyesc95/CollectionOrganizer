import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  anchorRect: DOMRect | null;
  photoSrc: string | null;
  tags: string[];
  ignoreRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
}

export default function AutographPreviewBubble({
  open,
  anchorRect,
  photoSrc,
  tags,
  ignoreRef,
  onClose,
}: Props) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!open || !anchorRect) return;
    const w = 200;
    const h = photoSrc ? 220 : 100;
    let left = anchorRect.left + anchorRect.width / 2 - w / 2;
    let top = anchorRect.top - h - 8;
    if (top < 8) {
      top = anchorRect.bottom + 8;
    }
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
    setStyle({ left, top, width: w, minHeight: photoSrc ? h : undefined });
  }, [open, anchorRect, photoSrc]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ignoreRef?.current?.contains(t) || bubbleRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose, ignoreRef]);

  if (!open || !anchorRect) return null;

  return createPortal(
    <div
      ref={bubbleRef}
      className="autograph-preview-bubble"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="autograph-preview-title">Signed</div>
      <div className="autograph-preview-tags">{tags.join(", ")}</div>
      {photoSrc ? (
        <img src={photoSrc} alt="Autograph" />
      ) : (
        <p className="autograph-preview-empty">No autograph photo found</p>
      )}
    </div>,
    document.body
  );
}
