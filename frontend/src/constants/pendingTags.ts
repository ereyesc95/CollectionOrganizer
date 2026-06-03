/** Default pending checklist for new records (matches backend STANDARD_PENDING_TAGS). */
export const DEFAULT_PENDING_TAGS: string[] = [
  "Cover",
  "Landscape Photo",
  "Portrait Photo",
  "Landscape Wallpaper",
  "Portrait Wallpaper",
  "Spotify Front",
  "Spotify Back",
  "Landscape Card Front",
  "Landscape Card Back",
  "Portrait Card Front",
  "Portrait Card Back",
];

export const LEGACY_EVERYTHING_TAG = "Everything";

export function pendingTagOptions(facetValues: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of [...DEFAULT_PENDING_TAGS, ...facetValues, "Spotify Code"]) {
    if (
      !tag ||
      tag === LEGACY_EVERYTHING_TAG ||
      tag === "Animation" ||
      tag === "Canvas" ||
      seen.has(tag)
    ) {
      continue;
    }
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

export function pendingManyTags(count: number): boolean {
  return count > 7;
}
