import { useEffect, useMemo, useRef, useState } from "react";
import {
  createRecord,
  deleteAutographPhoto,
  deleteRecord,
  fetchRecord,
  updateRecord,
  uploadAutographPhoto,
} from "../api";
import type { Facets, Record } from "../types";
import ImageLightbox from "./ImageLightbox";
import { ValuePickerMulti, ValuePickerSearchSelect, ValuePickerSingle } from "./ValuePicker";
import { RELEASE_TYPES } from "../constants/releaseTypes";
import { CountryLabel } from "./CountryFlag";
import { countryNames } from "../constants/countries";
import { DEFAULT_PENDING_TAGS, pendingTagOptions } from "../constants/pendingTags";
import { buildCoverKey } from "../utils/coverKey";
import { storedPendingTags } from "../utils/recordDisplay";

interface Props {
  record: Record | null;
  isNew: boolean;
  facets: Facets | null;
  onClose: () => void;
  onSaved: () => void;
}

function facetValues(facets: Facets | null, key: keyof Facets): string[] {
  return facets?.[key]?.map((o) => o.value) ?? [];
}

function parseYearInput(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

export default function RecordModal({ record, isNew, facets, onClose, onSaved }: Props) {
  const [artist, setArtist] = useState(record?.artist ?? "");
  const [recordYear, setRecordYear] = useState(record?.record_year?.toString() ?? "");
  const [title, setTitle] = useState(record?.title ?? "");
  const [editionYear, setEditionYear] = useState(record?.edition_year?.toString() ?? "");
  const [editionTitle, setEditionTitle] = useState(record?.edition_title ?? "");
  const [pendingTags, setPendingTags] = useState<string[]>(
    record ? storedPendingTags(record) : [...DEFAULT_PENDING_TAGS]
  );
  const [mediaTags, setMediaTags] = useState<string[]>(record?.media_tags ?? ["LP"]);
  const [animationTags, setAnimationTags] = useState<string[]>(record?.animation_tags ?? []);
  const [canvasTags, setCanvasTags] = useState<string[]>(record?.canvas_tags ?? []);
  const [autographTags, setAutographTags] = useState<string[]>(record?.autograph_tags ?? []);
  const [releaseType, setReleaseType] = useState(record?.release_type ?? "");
  const [genreTags, setGenreTags] = useState<string[]>(record?.genre_tags ?? []);
  const [countryTags, setCountryTags] = useState<string[]>(record?.country_tags ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hasAutographPhoto, setHasAutographPhoto] = useState(record?.has_autograph_photo ?? false);
  const [autographUrl, setAutographUrl] = useState(record?.autograph_photo_url ?? null);
  const [autographSource, setAutographSource] = useState(record?.autograph_photo_source ?? null);
  const [lightbox, setLightbox] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordId = record?.id;

  const coverKeyPreview = useMemo(() => {
    try {
      return buildCoverKey(
        artist,
        parseYearInput(recordYear),
        title,
        parseYearInput(editionYear),
        editionTitle
      );
    } catch {
      return null;
    }
  }, [artist, recordYear, title, editionYear, editionTitle]);

  const countryOptions = useMemo(() => {
    const set = new Set([...countryNames(), ...facetValues(facets, "country"), ...countryTags]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [facets, countryTags]);

  const topCountryOptions = useMemo(
    () => (facets?.country ?? []).slice(0, 3).map((o) => o.value),
    [facets]
  );

  const artistOptions = useMemo(() => {
    const fromFacets = facetValues(facets, "artist");
    const known = new Set(fromFacets.map((a) => a.toLowerCase()));
    const trimmed = artist.trim();
    if (trimmed && !known.has(trimmed.toLowerCase())) {
      return [...fromFacets, trimmed];
    }
    return fromFacets;
  }, [facets, artist]);

  useEffect(() => {
    if (!record) return;
    setArtist(record.artist);
    setRecordYear(record.record_year?.toString() ?? "");
    setTitle(record.title);
    setEditionYear(record.edition_year?.toString() ?? "");
    setEditionTitle(record.edition_title ?? "");
    setPendingTags(storedPendingTags(record));
    setMediaTags(record.media_tags);
    setAnimationTags(record.animation_tags);
    setCanvasTags(record.canvas_tags);
    setAutographTags(record.autograph_tags);
    setReleaseType(record.release_type ?? "");
    setGenreTags(record.genre_tags);
    setCountryTags(record.country_tags);
    setHasAutographPhoto(record.has_autograph_photo);
    setAutographUrl(record.autograph_photo_url);
    setAutographSource(record.autograph_photo_source);
    setPendingPhoto(null);
    setPendingPhotoPreview(null);
    setError("");
    setPhotoVersion((v) => v + 1);
  }, [record]);

  const buildBody = () => ({
    artist: artist.trim(),
    record_year: parseYearInput(recordYear),
    title: title.trim(),
    edition_year: parseYearInput(editionYear),
    edition_title: editionTitle.trim() || null,
    pending_tags: pendingTags,
    media_tags: mediaTags,
    animation_tags: animationTags,
    canvas_tags: canvasTags,
    autograph_tags: autographTags,
    release_type: releaseType.trim() || null,
    genre_tags: genreTags,
    country_tags: countryTags,
  });

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (!artist.trim() || !title.trim()) {
        setError("Artist and title are required");
        return;
      }
      if (isNew) {
        const created = await createRecord(buildBody());
        if (pendingPhoto && autographTags.length) {
          await uploadAutographPhoto(created.id, pendingPhoto);
        }
      } else if (record) {
        await updateRecord(record.id, buildBody());
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (isNew) {
      setPendingPhoto(file);
      setPendingPhotoPreview(URL.createObjectURL(file));
      return;
    }
    if (!recordId) return;
    setSaving(true);
    setError("");
    try {
      await uploadAutographPhoto(recordId, file);
      const updated = await fetchRecord(recordId);
      setHasAutographPhoto(updated.has_autograph_photo);
      setAutographUrl(updated.autograph_photo_url);
      setAutographSource(updated.autograph_photo_source);
      setPhotoVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoRemove = async () => {
    if (isNew) {
      setPendingPhoto(null);
      setPendingPhotoPreview(null);
      return;
    }
    if (!recordId || !confirm("Remove custom autograph photo?")) return;
    setSaving(true);
    try {
      await deleteAutographPhoto(recordId);
      const updated = await fetchRecord(recordId);
      setHasAutographPhoto(updated.has_autograph_photo);
      setAutographUrl(updated.autograph_photo_url);
      setAutographSource(updated.autograph_photo_source);
      setPhotoVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!record || !confirm("Delete this record permanently?")) return;
    setSaving(true);
    try {
      await deleteRecord(record.id);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const showAutographPhoto = autographTags.length > 0;
  const thumbSrc =
    pendingPhotoPreview ||
    (autographUrl ? `${autographUrl}?v=${photoVersion}` : null);
  const hasPhoto = !!(hasAutographPhoto || pendingPhotoPreview);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isNew ? "Add record" : "Edit record"}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          {coverKeyPreview && (
            <p className="cover-key-preview">
              Media files match: <code>{coverKeyPreview}</code>
            </p>
          )}
          <div className="form-grid">
            <ValuePickerSearchSelect
              className="form-grid-cell"
              label="Artist"
              value={artist}
              options={artistOptions}
              onChange={setArtist}
              allowEmpty={false}
              allowCustom
            />
            <div className="form-row">
              <label>Year</label>
              <input value={recordYear} onChange={(e) => setRecordYear(e.target.value)} type="number" />
            </div>
            <div className="form-row span2">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Edition title</label>
              <input value={editionTitle} onChange={(e) => setEditionTitle(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Edition year</label>
              <input value={editionYear} onChange={(e) => setEditionYear(e.target.value)} type="number" />
            </div>
          </div>
          <ValuePickerSearchSelect
            label="Country"
            value={countryTags[0] ?? ""}
            options={countryOptions}
            pinnedOptions={topCountryOptions}
            onChange={(v) => setCountryTags(v ? [v] : [])}
            formatOption={(v) => <CountryLabel name={v} />}
          />
          <ValuePickerMulti
            label="Genre"
            values={genreTags}
            options={facetValues(facets, "genre")}
            onChange={setGenreTags}
            searchable
          />
          <ValuePickerSingle
            label="Release type"
            value={releaseType}
            options={[...RELEASE_TYPES]}
            onChange={setReleaseType}
          />
          <ValuePickerMulti
            label="Media type"
            values={mediaTags}
            options={facetValues(facets, "media")}
            onChange={setMediaTags}
          />
          <ValuePickerMulti
            label="Animation"
            values={animationTags}
            options={facetValues(facets, "animation")}
            onChange={setAnimationTags}
          />
          <ValuePickerMulti
            label="Canvas"
            values={canvasTags}
            options={facetValues(facets, "canvas")}
            onChange={setCanvasTags}
          />
          <ValuePickerMulti
            label="Autographs"
            values={autographTags}
            options={facetValues(facets, "autograph")}
            onChange={setAutographTags}
          />
          <ValuePickerMulti
            label="Pending"
            values={pendingTags}
            options={pendingTagOptions(facetValues(facets, "pending"))}
            onChange={setPendingTags}
          />
          {(animationTags.length === 0 || canvasTags.length === 0) && (
            <p className="pending-derived-hint">
              {animationTags.length === 0 && "Animation "}
              {animationTags.length === 0 && canvasTags.length === 0 && "and "}
              {canvasTags.length === 0 && "Canvas "}
              appear in Pending automatically when those tags are missing.
            </p>
          )}
          {showAutographPhoto && (
            <div className="form-row autograph-photo-section">
              <label>Autograph photo</label>
              <p className="autograph-photo-hint">
                Photos in your autographs folder are matched automatically from artist, title, and
                edition above.
              </p>
              {hasPhoto && autographSource && !pendingPhotoPreview && (
                <p className="autograph-photo-source">
                  {autographSource === "folder"
                    ? "Using photo from autographs folder"
                    : "Using custom uploaded photo"}
                </p>
              )}
              <div className="autograph-photo-row">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoUpload(f);
                    e.target.value = "";
                  }}
                />
                {hasPhoto && thumbSrc ? (
                  <button
                    type="button"
                    className="autograph-thumb"
                    onClick={() => setLightbox(true)}
                    title="Click to enlarge"
                  >
                    <img src={thumbSrc} alt="Autograph" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="autograph-thumb empty"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                    title="Click to upload a custom autograph photo"
                  >
                    No photo
                  </button>
                )}
                {autographSource === "upload" && (
                  <div className="autograph-photo-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handlePhotoRemove}
                      disabled={saving}
                    >
                      Remove custom photo
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
        </div>
        <div className="modal-footer">
          {!isNew && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginRight: "auto", color: "var(--danger)" }}
              onClick={handleDelete}
              disabled={saving}
            >
              Delete
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {lightbox && thumbSrc && (
        <ImageLightbox
          src={thumbSrc}
          alt={`Autograph — ${artist}`}
          onClose={() => setLightbox(false)}
        />
      )}
    </div>
  );
}
