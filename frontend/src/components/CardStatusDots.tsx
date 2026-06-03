import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Record } from "../types";
import { recordStatusItems } from "../utils/recordDisplay";

interface DotProps {
  label: string;
  color: string;
  compact?: boolean;
}

function StatusDot({ label, color, compact }: DotProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!open) return;
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const w = 200;
    let left = rect.left - w - 8;
    let top = rect.top + rect.height / 2 - 18;
    if (left < 8) left = rect.right + 8;
    top = Math.max(8, Math.min(top, window.innerHeight - 40));
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    setStyle({ left, top, width: w });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || bubbleRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="card-status-dot"
        style={{ backgroundColor: color }}
        aria-label={label}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => e.stopPropagation()}
      />
      {open &&
        createPortal(
          <div
            ref={bubbleRef}
            className={`card-status-bubble${compact ? " pending-many" : ""}`}
            style={style}
            onClick={(e) => e.stopPropagation()}
          >
            {label}
          </div>,
          document.body
        )}
    </>
  );
}

interface Props {
  record: Record;
}

export default function CardStatusDots({ record }: Props) {
  const items = recordStatusItems(record);
  if (!items.length) return null;

  return (
    <div className="card-status-dots" onClick={(e) => e.stopPropagation()}>
      {items.map((item) => (
        <StatusDot
          key={item.kind}
          label={item.label}
          color={item.color}
          compact={item.compact}
        />
      ))}
    </div>
  );
}
