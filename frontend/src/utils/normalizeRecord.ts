import type { Record, RecordAssets } from "../types";

const EMPTY_ASSETS: RecordAssets = {
  canvas: { has_file: false, url: null },
  spotify: {
    front: { has_file: false, url: null },
    back: { has_file: false, url: null },
  },
  landscape_card: {
    front: { has_file: false, url: null },
    back: { has_file: false, url: null },
  },
  portrait_card: {
    front: { has_file: false, url: null },
    back: { has_file: false, url: null },
  },
};

export function normalizeRecord(r: Record): Record {
  return {
    ...r,
    release_type: r.release_type ?? null,
    genre_tags: r.genre_tags ?? [],
    country_tags: r.country_tags ?? [],
    animation_files: r.animation_files ?? [],
    canvas_files: r.canvas_files ?? [],
    assets: r.assets ?? EMPTY_ASSETS,
    has_canvas_file: r.has_canvas_file ?? false,
    canvas_url: r.canvas_url ?? null,
  };
}
