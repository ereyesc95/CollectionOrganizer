import { useRef, useState } from "react";
import type { Record } from "../types";
import {
  cardAssetHasFile,
  cardPreviewLayout,
  flipAssets,
  visibleCardAssets,
  type CardAssetConfig,
} from "../constants/cardAssets";
import FlipAssetPreview from "./FlipAssetPreview";

function IconSpotify() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 10.5c2.5-1 5.5-1 8 0M7.5 13c3-1 6-1 9 0M7 15.5c3.5-1 7-1 10 0" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function IconLandscape() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="7" width="18" height="10" rx="1.5" />
      <path d="M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

function IconPortrait() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="7" y="3" width="10" height="18" rx="1.5" />
      <path d="M12 9v6" strokeLinecap="round" />
    </svg>
  );
}

function AssetIcon({ kind }: { kind: CardAssetConfig["kind"] }) {
  if (kind === "spotify") return <IconSpotify />;
  if (kind === "landscape") return <IconLandscape />;
  return <IconPortrait />;
}

interface Props {
  record: Record;
}

export default function CardAssetIcons({ record }: Props) {
  const configs = visibleCardAssets(record);
  const [openKind, setOpenKind] = useState<CardAssetConfig["kind"] | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  if (!configs.length) return null;

  const openConfig = configs.find((c) => c.kind === openKind);

  return (
    <>
      {configs.map((config) => {
        const hasFile = cardAssetHasFile(record.assets, config.kind);
        return (
          <button
            key={config.kind}
            type="button"
            className={`card-asset-btn ${hasFile ? "has-file" : "no-file"}`}
            title={
              hasFile
                ? `${config.label} — click to preview`
                : `${config.label} — file not found`
            }
            aria-label={config.label}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasFile) return;
              const btn = e.currentTarget;
              activeBtnRef.current = btn;
              const rect = btn.getBoundingClientRect();
              if (openKind === config.kind) {
                setOpenKind(null);
                setAnchor(null);
              } else {
                setOpenKind(config.kind);
                setAnchor(rect);
              }
            }}
          >
            <AssetIcon kind={config.kind} />
          </button>
        );
      })}
      {openConfig && (
        <FlipAssetPreview
          open
          anchorRect={anchor}
          assets={flipAssets(record.assets, openConfig.kind)}
          title={openConfig.label}
          layout={cardPreviewLayout(openConfig.kind, "grid")}
          showClose
          ignoreRef={activeBtnRef}
          onClose={() => {
            setOpenKind(null);
            setAnchor(null);
          }}
        />
      )}
    </>
  );
}
