import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import { positionNearAnchor } from "../utils/previewLayout";

/** Position a fixed preview bubble from anchor + measured content size (ResizeObserver). */
export function useAnchoredPreviewPosition(
  anchorRect: DOMRect | null,
  visible: boolean,
  contentRef: RefObject<HTMLElement | null>,
  gap = 12
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({
    visibility: "hidden",
    pointerEvents: "none",
  });

  useEffect(() => {
    if (!visible || !anchorRect || !contentRef.current) {
      setStyle({ visibility: "hidden", pointerEvents: "none" });
      return;
    }

    let raf = 0;
    let cancelled = false;

    const update = () => {
      if (cancelled) return;
      const el = contentRef.current;
      if (!el || !anchorRect) return;
      const { width, height } = el.getBoundingClientRect();
      if (width < 8 || height < 8) {
        raf = requestAnimationFrame(update);
        return;
      }
      const { left, top } = positionNearAnchor(anchorRect, width, height, gap);
      setStyle({ left, top, visibility: "visible", pointerEvents: "auto" });
    };

    setStyle({ visibility: "hidden", pointerEvents: "auto" });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(contentRef.current);
    window.addEventListener("resize", update);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [visible, anchorRect, contentRef, gap]);

  return style;
}
