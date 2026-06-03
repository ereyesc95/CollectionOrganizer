import type { CardAssetKind, FlipCardAssets, Record, RecordAssets } from "../types";

export type CardAssetConfig = {
  kind: CardAssetKind;
  label: string;
  pendingTags: string[];
};

export type CardPreviewContext = "grid" | "list";

export type CardPreviewLayout = {
  orientation: "portrait" | "landscape";
  maxWidth: number;
  maxHeight: number;
};

export const CARD_ASSET_CONFIGS: CardAssetConfig[] = [
  {
    kind: "portrait",
    label: "Portrait card",
    pendingTags: ["Portrait Card Front", "Portrait Card Back"],
  },
  {
    kind: "landscape",
    label: "Landscape card",
    pendingTags: ["Landscape Card Front", "Landscape Card Back"],
  },
  {
    kind: "spotify",
    label: "Spotify card",
    pendingTags: ["Spotify Front", "Spotify Back"],
  },
];

/** Max preview dimensions per card type (portrait grid size is the baseline). */
export function cardPreviewLayout(
  kind: CardAssetKind,
  context: CardPreviewContext = "grid"
): CardPreviewLayout {
  if (kind === "landscape") {
    return { orientation: "landscape", maxWidth: 440, maxHeight: 290 };
  }
  if (kind === "spotify") {
    if (context === "list") {
      return { orientation: "portrait", maxWidth: 320, maxHeight: 470 };
    }
    return { orientation: "portrait", maxWidth: 340, maxHeight: 500 };
  }
  return { orientation: "portrait", maxWidth: 300, maxHeight: 440 };
}

export function flipAssets(assets: RecordAssets, kind: CardAssetKind): FlipCardAssets {
  if (kind === "spotify") return assets.spotify;
  if (kind === "landscape") return assets.landscape_card;
  return assets.portrait_card;
}

export function cardAssetHasFile(assets: RecordAssets, kind: CardAssetKind): boolean {
  const card = flipAssets(assets, kind);
  return card.front.has_file || card.back.has_file;
}

/** Show button unless both front and back are still in the pending checklist. */
export function cardAssetShouldShow(record: Record, config: CardAssetConfig): boolean {
  const [frontTag, backTag] = config.pendingTags;
  const frontPending = record.pending_tags.includes(frontTag);
  const backPending = record.pending_tags.includes(backTag);
  return !(frontPending && backPending);
}

export function visibleCardAssets(record: Record): CardAssetConfig[] {
  return CARD_ASSET_CONFIGS.filter((c) => cardAssetShouldShow(record, c));
}

export function spotifyCardConfig(): CardAssetConfig {
  return CARD_ASSET_CONFIGS.find((c) => c.kind === "spotify")!;
}
