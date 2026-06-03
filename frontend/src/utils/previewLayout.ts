export const PREVIEW_MAX_IMAGE = { w: 320, h: 480 };
export const PREVIEW_MAX_VIDEO = { w: 280, h: 420 };

export function fitMediaSize(
  naturalW: number,
  naturalH: number,
  maxW: number,
  maxH: number
): { width: number; height: number } {
  if (!naturalW || !naturalH) {
    return { width: Math.min(maxW, maxH), height: Math.min(maxW, maxH) };
  }
  const scale = Math.min(maxW / naturalW, maxH / naturalH, 1);
  return {
    width: Math.max(1, Math.round(naturalW * scale)),
    height: Math.max(1, Math.round(naturalH * scale)),
  };
}

export function positionNearAnchor(
  anchor: DOMRect,
  boxW: number,
  boxH: number,
  gap = 12
): { left: number; top: number } {
  let left = anchor.right + gap;
  let top = anchor.top + anchor.height / 2 - boxH / 2;
  if (left + boxW > window.innerWidth - 8) {
    left = anchor.left - boxW - gap;
  }
  top = Math.max(8, Math.min(top, window.innerHeight - boxH - 8));
  left = Math.max(8, Math.min(left, window.innerWidth - boxW - 8));
  return { left, top };
}
