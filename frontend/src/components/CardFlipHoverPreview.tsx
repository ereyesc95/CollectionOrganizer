import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Record } from "../types";
import { cardPreviewLayout, flipAssets } from "../constants/cardAssets";
import { editionLabel } from "../utils/recordDisplay";
import { useAnchoredPreviewPosition } from "../hooks/useAnchoredPreviewPosition";
import FlipCardStage from "./FlipCardStage";

type Orientation = "portrait" | "landscape";

interface Props {
  record: Record | null;
  editions?: Record[];
  anchorRect: DOMRect | null;
  visible: boolean;
  onSelectEdition?: (id: number) => void;
  onPreviewEnter?: () => void;
  onPreviewLeave?: () => void;
}

export default function CardFlipHoverPreview({
  record,
  editions = [],
  anchorRect,
  visible,
  onSelectEdition,
  onPreviewEnter,
  onPreviewLeave,
}: Props) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const position = useAnchoredPreviewPosition(anchorRect, visible && !!record, bubbleRef, 6);

  useEffect(() => {
    if (visible) setOrientation("portrait");
  }, [visible, record?.id]);

  if (!visible || !anchorRect || !record) return null;

  const portrait = flipAssets(record.assets, "portrait");
  const landscape = flipAssets(record.assets, "landscape");
  const assets = orientation === "portrait" ? portrait : landscape;
  const label = orientation === "portrait" ? "Portrait card" : "Landscape card";
  const layout = cardPreviewLayout(orientation, "list");
  const showEditionPicker = editions.length > 1;

  return createPortal(
    <div
      ref={bubbleRef}
      className="card-flip-hover-preview card-flip-hover-preview--fit"
      style={position}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={onPreviewEnter}
      onMouseLeave={onPreviewLeave}
    >
      <div className="card-flip-hover-tabs">
        <button
          type="button"
          className={orientation === "portrait" ? "active" : ""}
          onClick={() => setOrientation("portrait")}
        >
          Portrait
        </button>
        <button
          type="button"
          className={orientation === "landscape" ? "active" : ""}
          onClick={() => setOrientation("landscape")}
        >
          Landscape
        </button>
      </div>
      <FlipCardStage
        key={`${record.id}-${orientation}`}
        assets={assets}
        title={label}
        orientation={orientation}
        maxWidth={layout.maxWidth}
        maxHeight={layout.maxHeight}
      />
      {showEditionPicker && (
        <div className="card-flip-hover-editions">
          {editions.map((ed) => (
            <button
              key={ed.id}
              type="button"
              className={ed.id === record.id ? "active" : ""}
              title={editionLabel(ed)}
              onClick={() => onSelectEdition?.(ed.id)}
            >
              {editionLabel(ed)}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
