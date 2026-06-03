import { useEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { CardPreviewLayout } from "../constants/cardAssets";
import type { FlipCardAssets } from "../types";
import { useAnchoredPreviewPosition } from "../hooks/useAnchoredPreviewPosition";
import FlipCardStage from "./FlipCardStage";

interface Props {
  open: boolean;
  anchorRect: DOMRect | null;
  assets: FlipCardAssets;
  title: string;
  layout?: CardPreviewLayout;
  ignoreRef?: RefObject<HTMLElement | null>;
  showClose?: boolean;
  onClose: () => void;
}

const DEFAULT_LAYOUT: CardPreviewLayout = {
  orientation: "portrait",
  maxWidth: 300,
  maxHeight: 440,
};

export default function FlipAssetPreview({
  open,
  anchorRect,
  assets,
  title,
  layout = DEFAULT_LAYOUT,
  ignoreRef,
  showClose = false,
  onClose,
}: Props) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const position = useAnchoredPreviewPosition(anchorRect, open, bubbleRef);
  const hasContent = assets.front.has_file || assets.back.has_file;

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

  if (!open || !anchorRect || !hasContent) return null;

  return createPortal(
    <div
      ref={bubbleRef}
      className="flip-asset-preview flip-asset-preview--fit"
      style={position}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flip-asset-preview-header">
        <strong>{title}</strong>
        {showClose && (
          <button
            type="button"
            className="preview-close modal-close"
            aria-label="Close preview"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>
      <FlipCardStage
        key={`${title}-${layout.orientation}-${layout.maxWidth}`}
        assets={assets}
        title={title}
        orientation={layout.orientation}
        maxWidth={layout.maxWidth}
        maxHeight={layout.maxHeight}
      />
    </div>,
    document.body
  );
}
