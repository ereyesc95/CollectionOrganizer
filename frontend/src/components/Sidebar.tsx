import { useState, type ReactNode } from "react";
import type { Facets, Filters } from "../types";
import { releaseTypeFacetOptions } from "../constants/releaseTypes";
import { CountryLabel } from "./CountryFlag";

const SECTION_KEYS = [
  "media",
  "release-type",
  "country",
  "genre",
  "animation",
  "canvas",
  "autograph",
  "has-autograph",
  "has-animation",
  "has-canvas",
  "pending",
  "has-cover",
];

interface Props {
  facets: Facets | null;
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
  onClear: () => void;
}

function CollapsibleSection({
  title,
  sectionKey,
  forceOpen,
  onUserToggle,
  children,
}: {
  title: string;
  sectionKey: string;
  forceOpen: boolean | null;
  onUserToggle?: () => void;
  children: ReactNode;
}) {
  const storageKey = `filter-section-${sectionKey}`;
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved === null ? true : saved === "1";
  });

  const isOpen = forceOpen !== null ? forceOpen : open;

  const toggle = () => {
    onUserToggle?.();
    const next = !isOpen;
    setOpen(next);
    localStorage.setItem(storageKey, next ? "1" : "0");
  };

  return (
    <div className={`filter-section ${isOpen ? "open" : "collapsed"}`}>
      <button type="button" className="filter-section-title" onClick={toggle}>
        <span className="chevron">{isOpen ? "▼" : "▶"}</span>
        {title}
      </button>
      {isOpen && <div className="filter-section-body">{children}</div>}
    </div>
  );
}

function FacetCheckboxes({
  options,
  selected,
  onToggle,
  formatOption,
}: {
  options: { value: string; count: number }[];
  selected: string[];
  onToggle: (value: string) => void;
  formatOption?: (value: string) => React.ReactNode;
}) {
  return (
    <>
      {options.map((o) => (
        <label key={o.value} className="filter-option">
          <input
            type="checkbox"
            checked={selected.includes(o.value)}
            onChange={() => onToggle(o.value)}
          />
          <span>{formatOption ? formatOption(o.value) : o.value}</span>
          <span className="count">{o.count}</span>
        </label>
      ))}
    </>
  );
}

function TriFilter({
  value,
  onChange,
}: {
  value: "" | "yes" | "no";
  onChange: (v: "" | "yes" | "no") => void;
}) {
  return (
    <div className="tri-toggle">
      {(["", "yes", "no"] as const).map((v) => (
        <button
          key={v || "any"}
          type="button"
          className={`btn btn-ghost ${value === v ? "active" : ""}`}
          onClick={() => onChange(v)}
        >
          {v === "" ? "Any" : v === "yes" ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

export default function Sidebar({ facets, filters, onChange, onClear }: Props) {
  const [forceOpen, setForceOpen] = useState<boolean | null>(null);
  const [sectionsVersion, setSectionsVersion] = useState(0);

  const allCollapsed = forceOpen === false;

  const collapseAll = () => {
    SECTION_KEYS.forEach((k) => localStorage.setItem(`filter-section-${k}`, "0"));
    setForceOpen(false);
    setSectionsVersion((v) => v + 1);
  };

  const expandAll = () => {
    SECTION_KEYS.forEach((k) => localStorage.setItem(`filter-section-${k}`, "1"));
    setForceOpen(true);
    setSectionsVersion((v) => v + 1);
  };

  const releaseForce = () => {
    setForceOpen(null);
    setSectionsVersion((v) => v + 1);
  };

  const toggle = (key: keyof Filters, value: string) => {
    releaseForce();
    const arr = filters[key] as string[];
    const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
    onChange({ [key]: next });
  };

  const sectionProps = { forceOpen, onUserToggle: releaseForce };

  return (
    <aside className="sidebar">
      <div className="sidebar-toolbar">
        <button type="button" className="btn btn-ghost sidebar-tool" onClick={onClear} title="Clear filters">
          <span className="tool-icon" aria-hidden>
            ✕
          </span>
          Clear
        </button>
        <button
          type="button"
          className="btn btn-ghost sidebar-tool"
          onClick={allCollapsed ? expandAll : collapseAll}
          title={allCollapsed ? "Expand all sections" : "Collapse all sections"}
        >
          <span className="tool-icon" aria-hidden>
            {allCollapsed ? "▾" : "▴"}
          </span>
          {allCollapsed ? "Expand all" : "Collapse all"}
        </button>
      </div>

      <CollapsibleSection
        key={`media-${sectionsVersion}`}
        title="Media type"
        sectionKey="media"
        {...sectionProps}
      >
        <FacetCheckboxes
          options={facets?.media ?? []}
          selected={filters.media}
          onToggle={(v) => toggle("media", v)}
        />
      </CollapsibleSection>

      <CollapsibleSection
        key={`release-type-${sectionsVersion}`}
        title="Release type"
        sectionKey="release-type"
        {...sectionProps}
      >
        <FacetCheckboxes
          options={releaseTypeFacetOptions(facets?.release_type)}
          selected={filters.releaseType}
          onToggle={(v) => toggle("releaseType", v)}
        />
      </CollapsibleSection>

      <CollapsibleSection
        key={`country-${sectionsVersion}`}
        title="Country"
        sectionKey="country"
        {...sectionProps}
      >
        <FacetCheckboxes
          options={facets?.country ?? []}
          selected={filters.country}
          onToggle={(v) => toggle("country", v)}
          formatOption={(v) => <CountryLabel name={v} />}
        />
      </CollapsibleSection>

      <CollapsibleSection
        key={`genre-${sectionsVersion}`}
        title="Genre"
        sectionKey="genre"
        {...sectionProps}
      >
        <FacetCheckboxes
          options={facets?.genre ?? []}
          selected={filters.genre}
          onToggle={(v) => toggle("genre", v)}
        />
      </CollapsibleSection>

      <CollapsibleSection
        key={`animation-${sectionsVersion}`}
        title="Animation"
        sectionKey="animation"
        {...sectionProps}
      >
        <FacetCheckboxes
          options={facets?.animation ?? []}
          selected={filters.animation}
          onToggle={(v) => toggle("animation", v)}
        />
      </CollapsibleSection>

      <CollapsibleSection
        key={`canvas-${sectionsVersion}`}
        title="Canvas"
        sectionKey="canvas"
        {...sectionProps}
      >
        <FacetCheckboxes
          options={facets?.canvas ?? []}
          selected={filters.canvas}
          onToggle={(v) => toggle("canvas", v)}
        />
      </CollapsibleSection>

      <CollapsibleSection
        key={`autograph-${sectionsVersion}`}
        title="Autographs"
        sectionKey="autograph"
        {...sectionProps}
      >
        <FacetCheckboxes
          options={facets?.autograph ?? []}
          selected={filters.autograph}
          onToggle={(v) => toggle("autograph", v)}
        />
      </CollapsibleSection>

      <CollapsibleSection
        key={`has-autograph-${sectionsVersion}`}
        title="Has autograph"
        sectionKey="has-autograph"
        {...sectionProps}
      >
        <TriFilter
          value={filters.hasAutograph}
          onChange={(v) => {
            releaseForce();
            onChange({ hasAutograph: v });
          }}
        />
      </CollapsibleSection>

      <CollapsibleSection
        key={`has-animation-${sectionsVersion}`}
        title="Has animation"
        sectionKey="has-animation"
        {...sectionProps}
      >
        <TriFilter
          value={filters.hasAnimation}
          onChange={(v) => {
            releaseForce();
            onChange({ hasAnimation: v });
          }}
        />
      </CollapsibleSection>

      <CollapsibleSection
        key={`has-canvas-${sectionsVersion}`}
        title="Has canvas"
        sectionKey="has-canvas"
        {...sectionProps}
      >
        <TriFilter
          value={filters.hasCanvas}
          onChange={(v) => {
            releaseForce();
            onChange({ hasCanvas: v });
          }}
        />
      </CollapsibleSection>

      <CollapsibleSection
        key={`pending-${sectionsVersion}`}
        title="Pending"
        sectionKey="pending"
        {...sectionProps}
      >
        <FacetCheckboxes
          options={facets?.pending ?? []}
          selected={filters.pending}
          onToggle={(v) => toggle("pending", v)}
        />
      </CollapsibleSection>

      <CollapsibleSection
        key={`has-cover-${sectionsVersion}`}
        title="Has cover image"
        sectionKey="has-cover"
        {...sectionProps}
      >
        <TriFilter
          value={filters.hasCover}
          onChange={(v) => {
            releaseForce();
            onChange({ hasCover: v });
          }}
        />
      </CollapsibleSection>
    </aside>
  );
}
