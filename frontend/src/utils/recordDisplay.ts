import type { Record } from "../types";

export function isStandardEdition(r: Record): boolean {
  return !r.edition_year && !r.edition_title;
}

export function editionLabel(r: Record): string {
  if (isStandardEdition(r)) return "Standard Edition";
  return `${r.edition_year ?? ""} ${r.edition_title ?? ""}`.trim();
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

export function cardStatusClasses(r: Record): string {
  const classes: string[] = [];
  if (!r.animation_tags.length) classes.push("status-no-animation");
  if (!r.canvas_tags.length) classes.push("status-no-canvas");
  if (r.pending) classes.push("status-pending");
  return classes.join(" ");
}
