export interface MediaSide {
  has_file: boolean;
  url: string | null;
}

export interface FlipCardAssets {
  front: MediaSide;
  back: MediaSide;
}

export interface RecordAssets {
  canvas: MediaSide;
  spotify: FlipCardAssets;
  landscape_card: FlipCardAssets;
  portrait_card: FlipCardAssets;
}

export interface Record {
  id: number;
  cover_key: string;
  artist: string;
  record_year: number | null;
  title: string;
  edition_year: number | null;
  edition_title: string | null;
  pending_tags: string[];
  media_tags: string[];
  animation_tags: string[];
  canvas_tags: string[];
  autograph_tags: string[];
  release_type: string | null;
  genre_tags: string[];
  country_tags: string[];
  has_cover: boolean;
  cover_url: string | null;
  has_autograph_photo: boolean;
  autograph_photo_url: string | null;
  autograph_photo_source: "folder" | "upload" | null;
  has_animation_file: boolean;
  animation_url: string | null;
  animation_files: boolean[];
  has_canvas_file: boolean;
  canvas_url: string | null;
  canvas_files: boolean[];
  assets: RecordAssets;
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
  release_type: FacetOption[];
  genre: FacetOption[];
  country: FacetOption[];
  artist: FacetOption[];
}

export interface RecordList {
  items: Record[];
  total: number;
  record_total: number;
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

export interface AudioTrack {
  index: number;
  track_number: string | null;
  title: string;
  disc: string | null;
  url: string;
}

export interface AudioTracksResponse {
  tracks: AudioTrack[];
}

export interface ArtworkImage {
  index: number;
  title: string;
  url: string;
}

export interface ArtworkListResponse {
  images: ArtworkImage[];
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
  releaseType: string[];
  genre: string[];
  country: string[];
  hasAutograph: "" | "yes" | "no";
  hasAnimation: "" | "yes" | "no";
  hasCanvas: "" | "yes" | "no";
  hasPending: "" | "yes" | "no";
  hasCover: "" | "yes" | "no";
  sortKeys: SortKey[];
}

export type CardAssetKind = "spotify" | "landscape" | "portrait";
