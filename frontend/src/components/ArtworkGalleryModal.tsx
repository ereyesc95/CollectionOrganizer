import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ArtworkImage } from "../types";

interface Props {
  open: boolean;
  images: ArtworkImage[];
  onClose: () => void;
}

export default function ArtworkGalleryModal({ open, images, onClose }: Props) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (open) setSelected(0);
  }, [open, images]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setSelected((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setSelected((i) => Math.min(images.length - 1, i + 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, images.length, onClose]);

  if (!open || !images.length) return null;

  const current = images[selected] ?? images[0];

  return createPortal(
    <div
      className="artwork-gallery-overlay"
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        onClose();
      }}
    >
      <div
        className="artwork-gallery"
        role="dialog"
        aria-label="Artwork gallery"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="artwork-gallery-close modal-close"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className="artwork-gallery-main">
          <img key={current.url} src={current.url} alt={current.title} />
        </div>
        <div className="artwork-gallery-thumbs-wrap">
          <div className="artwork-gallery-thumbs">
            {images.map((img) => (
              <button
                key={img.index}
                type="button"
                className={`artwork-gallery-thumb${img.index === selected ? " active" : ""}`}
                onClick={() => setSelected(img.index)}
                title={img.title}
                aria-label={img.title}
              >
                <img src={img.url} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
