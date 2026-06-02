export interface Record {
  id: number;
  cover_key: string;
  artist: string;
  record_year: number | null;
  title: string;
  edition_year: number | null;
  edition_title: string | null;
  pending: string | null;
  media_tags: string[];
  animation_tags: string[];
  canvas_tags: string[];
  autograph_tags: string[];
  has_cover: boolean;
  cover_url: string | null;
  has_autograph_photo: boolean;
  autograph_photo_url: string | null;
  autograph_photo_source: "folder" | "upload" | null;
  has_animation_file: boolean;
  animation_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface FacetOption {
  value: string;
  count: number;
}

export interface Facets {
  media: FacetOption[];
  animation: FacetOption[];
  canvas: FacetOption[];
  autograph: FacetOption[];
  pending: FacetOption[];
}

export interface RecordList {
  items: Record[];
  total: number;
  page: number;
  page_size: number;
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface ParsePreview {
  cover_key: string;
  artist: string;
  record_year: number | null;
  title: string;
  edition_year: number | null;
  edition_title: string | null;
}

export type ViewMode = "list" | "grid";

export type SortField = "artist" | "year" | "title" | "edition";

export interface SortKey {
  field: SortField;
  order: "asc" | "desc";
}

export interface Filters {
  search: string;
  media: string[];
  animation: string[];
  canvas: string[];
  autograph: string[];
  pending: string[];
  hasAutograph: "" | "yes" | "no";
  hasAnimation: "" | "yes" | "no";
  hasCanvas: "" | "yes" | "no";
  hasPending: "" | "yes" | "no";
  hasCover: "" | "yes" | "no";
  sortKeys: SortKey[];
}
