import type { MouseEvent } from "react";

interface Props {
  label: string;
  className: string;
  removable?: boolean;
  busy?: boolean;
  onRemove?: () => void;
}

export default function RemovableTag({
  label,
  className,
  removable = true,
  busy = false,
  onRemove,
}: Props) {
  const handleRemove = (e: MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    onRemove?.();
  };

  return (
    <span className={`tag tag-removable ${className}${busy ? " tag-removable--busy" : ""}`}>
      <span className="tag-removable-label">{label}</span>
      {removable && (
        <button
          type="button"
          className="tag-removable-remove"
          aria-label={`Remove ${label}`}
          disabled={busy}
          onClick={handleRemove}
        >
          ×
        </button>
      )}
    </span>
  );
}
