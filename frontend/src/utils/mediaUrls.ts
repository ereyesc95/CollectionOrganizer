/** Indexed animation/canvas URLs — 1st file has no suffix; 2nd+ use ?index=2, ?index=3, … */

export function animationMediaUrl(recordId: number, index = 1): string {
  if (index <= 1) return `/api/animations/${recordId}`;
  return `/api/animations/${recordId}?index=${index}`;
}

export function canvasMediaUrl(recordId: number, index = 1): string {
  if (index <= 1) return `/api/canvas/${recordId}`;
  return `/api/canvas/${recordId}?index=${index}`;
}

export function indexedMediaHasFile(
  files: boolean[] | undefined,
  index: number,
  fallbackFirst: boolean
): boolean {
  if (files && index < files.length) return files[index];
  return index === 0 && fallbackFirst;
}
