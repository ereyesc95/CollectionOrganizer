import { DEFAULT_PENDING_TAGS, pendingManyTags } from "../constants/pendingTags";
import type { Record } from "../types";

export const PENDING_STATUS_COLOR = "#fca5a5";

export function isStandardEdition(r: Record): boolean {
  return !r.edition_year && !r.edition_title;
}

export function editionLabel(r: Record): string {
  if (isStandardEdition(r)) return "Standard Edition";
  return `${r.edition_year ?? ""} ${r.edition_title ?? ""}`.trim();
}

/** Edition title in list view (edition year is shown separately in the table). */
export function editionListLabel(r: Record): string {
  if (isStandardEdition(r)) return "Standard Edition";
  return r.edition_title?.trim() ?? "";
}

export function editionKey(r: Record): string {
  if (isStandardEdition(r)) return "standard";
  return `${r.edition_year ?? ""}|${r.edition_title ?? ""}`;
}

export function albumKey(r: Record): string {
  return `${r.artist}\0${r.record_year ?? ""}\0${r.title}`;
}

export function formatAlbumLine(r: Record): string {
  const year = r.record_year ?? "????";
  return `${r.artist}, ${year}. ${r.title}`;
}

/** Year shown on cover cards: edition year if set, else record year */
export function displayYear(r: Record): string {
  if (r.edition_year) return String(r.edition_year);
  if (r.record_year) return String(r.record_year);
  return "????";
}

/** Original release year (list view Year column). */
export function displayRecordYear(r: Record): string {
  if (r.record_year) return String(r.record_year);
  return "????";
}

export type MediaOnlyBackMode = "canvas" | "animation" | "portrait_card" | "cover";

/** Visual fallback for the card back when no audio tracks exist. */
export function mediaOnlyBackFallback(
  r: Record,
  canvasUrl: string | null,
  hasCanvas: boolean
): MediaOnlyBackMode | null {
  if (hasCanvas && canvasUrl) return "canvas";
  if (r.has_animation_file && r.animation_url) return "animation";
  const portraitBack = r.assets.portrait_card.back;
  if (portraitBack.has_file && portraitBack.url) return "portrait_card";
  if (r.has_cover && r.cover_url) return "cover";
  return null;
}

/** Tags stored in DB only (excludes derived Animation/Canvas). */
export function storedPendingTags(r: Record): string[] {
  const tags = r.pending_tags.filter(
    (t) => t !== "Animation" && t !== "Canvas" && t !== "Everything"
  );
  if (r.pending_tags.includes("Everything")) {
    const seen = new Set(tags);
    return [...tags, ...DEFAULT_PENDING_TAGS.filter((t) => !seen.has(t))];
  }
  return tags;
}

/** List/grid tags: accent when source file exists, muted when tag present but file missing. */
export function sourceTagClass(hasTags: boolean, hasSource: boolean): string {
  if (!hasTags) return "tag";
  return `tag ${hasSource ? "tag-sourced" : "tag-missing-source"}`;
}

export function recordStatusItems(
  r: Record
): { kind: "pending"; label: string; color: string; compact?: boolean }[] {
  if (!r.pending_tags.length) return [];
  const label = r.pending_tags.join(", ");
  return [
    {
      kind: "pending",
      label,
      color: PENDING_STATUS_COLOR,
      compact: pendingManyTags(r.pending_tags.length),
    },
  ];
}
