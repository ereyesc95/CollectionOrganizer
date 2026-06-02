import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { Record } from "../types";
import { editionLabel } from "../utils/recordDisplay";

interface Props {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  siblings: Record[];
  currentId: number;
  onPick: (id: number) => void;
  onClose: () => void;
}

export default function EditionDropdownPortal({
  open,
  anchorRef,
  siblings,
  currentId,
  onPick,
  onClose,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!open || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const maxH = 240;
    let top = rect.bottom + 4;
    if (top + maxH > window.innerHeight - 8) {
      top = Math.max(8, rect.top - maxH - 4);
    }
    setStyle({
      position: "fixed",
      top,
      left: rect.left,
      minWidth: Math.max(rect.width, 200),
      maxWidth: 280,
      maxHeight: maxH,
      overflowY: "auto",
      zIndex: 300,
    });
  }, [open, anchorRef, siblings.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, anchorRef, onClose]);

  if (!open || !anchorRef.current) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="edition-dropdown edition-dropdown-portal"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      {siblings.map((s) => (
        <button
          key={s.id}
          type="button"
          className={s.id === currentId ? "active" : ""}
          onClick={() => onPick(s.id)}
        >
          {editionLabel(s)}
          <span className="edition-dd-media">{s.media_tags.join(", ")}</span>
        </button>
      ))}
    </div>,
    document.body
  );
}
