import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

interface Props {
  src: string;
  alt: string;
  anchorRect: DOMRect | null;
  visible: boolean;
}

export default function HoverPreview({ src, alt, anchorRect, visible }: Props) {
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!visible || !anchorRect) return;
    const w = 220;
    const h = 220;
    let left = anchorRect.right + 12;
    let top = anchorRect.top + anchorRect.height / 2 - h / 2;
    if (left + w > window.innerWidth - 8) {
      left = anchorRect.left - w - 12;
    }
    top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
    setStyle({ left, top, width: w, height: h });
  }, [visible, anchorRect]);

  if (!visible || !anchorRect) return null;

  return createPortal(
    <div className="hover-preview" style={style}>
      <img src={src} alt={alt} />
    </div>,
    document.body
  );
}
