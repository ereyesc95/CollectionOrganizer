/** Build cover filename stem: Artist, Year. Title[, Edition Year Edition title]. */
export function buildCoverKey(
  artist: string,
  recordYear: number | null | undefined,
  title: string,
  editionYear?: number | null,
  editionTitle?: string | null
): string {
  const a = artist.trim();
  const t = title.trim();
  if (!a || !t) {
    throw new Error("Artist and title are required");
  }
  const year =
    recordYear !== null && recordYear !== undefined && !Number.isNaN(recordYear)
      ? String(recordYear)
      : "????";
  const base = `${a}, ${year}. ${t}`;
  const et = (editionTitle ?? "").trim();
  const ey =
    editionYear != null && !Number.isNaN(editionYear) ? editionYear : null;
  const showEditionYear =
    ey != null && (recordYear == null || Number.isNaN(recordYear) || ey !== recordYear);
  if (et && showEditionYear) {
    return `${base}, ${ey} ${et}`;
  }
  if (et) return `${base}, ${et}`;
  if (showEditionYear) {
    return `${base}, ${ey}`;
  }
  return base;
}
