import { useEffect, useRef, useState } from "react";
import {
  createRecord,
  deleteAutographPhoto,
  deleteRecord,
  fetchRecord,
  parsePreview,
  updateRecord,
  uploadAutographPhoto,
} from "../api";
import type { Facets, ParsePreview, Record } from "../types";
import ImageLightbox from "./ImageLightbox";
import { ValuePickerMulti, ValuePickerSingle } from "./ValuePicker";

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

export default function RecordModal({ record, isNew, facets, onClose, onSaved }: Props) {
  const [coverKey, setCoverKey] = useState(record?.cover_key ?? "");
  const [artist, setArtist] = useState(record?.artist ?? "");
  const [recordYear, setRecordYear] = useState(record?.record_year?.toString() ?? "");
  const [title, setTitle] = useState(record?.title ?? "");
  const [editionYear, setEditionYear] = useState(record?.edition_year?.toString() ?? "");
  const [editionTitle, setEditionTitle] = useState(record?.edition_title ?? "");
  const [pending, setPending] = useState(record?.pending ?? "");
  const [mediaTags, setMediaTags] = useState<string[]>(record?.media_tags ?? ["LP"]);
  const [animationTags, setAnimationTags] = useState<string[]>(record?.animation_tags ?? []);
  const [canvasTags, setCanvasTags] = useState<string[]>(record?.canvas_tags ?? []);
  const [autographTags, setAutographTags] = useState<string[]>(record?.autograph_tags ?? []);
  const [preview, setPreview] = useState<ParsePreview | null>(null);
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

  useEffect(() => {
    if (!record) return;
    setCoverKey(record.cover_key);
    setArtist(record.artist);
    setRecordYear(record.record_year?.toString() ?? "");
    setTitle(record.title);
    setEditionYear(record.edition_year?.toString() ?? "");
    setEditionTitle(record.edition_title ?? "");
    setPending(record.pending ?? "");
    setMediaTags(record.media_tags);
    setAnimationTags(record.animation_tags);
    setCanvasTags(record.canvas_tags);
    setAutographTags(record.autograph_tags);
    setHasAutographPhoto(record.has_autograph_photo);
    setAutographUrl(record.autograph_photo_url);
    setAutographSource(record.autograph_photo_source);
    setPendingPhoto(null);
    setPendingPhotoPreview(null);
    setPreview(null);
    setError("");
    setPhotoVersion((v) => v + 1);
  }, [record]);

  useEffect(() => {
    if (!isNew || coverKey.length < 5) return;
    const t = setTimeout(() => {
      parsePreview(coverKey)
        .then((p) => {
          setPreview(p);
          if (!artist) setArtist(p.artist);
          if (!recordYear && p.record_year) setRecordYear(String(p.record_year));
          if (!title) setTitle(p.title);
          if (!editionYear && p.edition_year) setEditionYear(String(p.edition_year));
          if (!editionTitle && p.edition_title) setEditionTitle(p.edition_title);
        })
        .catch(() => setPreview(null));
    }, 400);
    return () => clearTimeout(t);
  }, [coverKey, isNew, artist, title, recordYear, editionYear, editionTitle]);

  const buildBody = () => ({
    cover_key: coverKey.trim(),
    artist: artist.trim(),
    record_year: recordYear ? parseInt(recordYear, 10) : null,
    title: title.trim(),
    edition_year: editionYear ? parseInt(editionYear, 10) : null,
    edition_title: editionTitle.trim() || null,
    pending: pending.trim() || null,
    media_tags: mediaTags,
    animation_tags: animationTags,
    canvas_tags: canvasTags,
    autograph_tags: autographTags,
  });

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isNew ? "Add record" : "Edit record"}</h2>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <label>Album / cover key (exact filename stem)</label>
            <textarea value={coverKey} onChange={(e) => setCoverKey(e.target.value)} rows={2} />
          </div>
          {preview && (
            <div className="parse-preview">
              Parsed: {preview.artist}, {preview.record_year}. {preview.title}
              {preview.edition_year && ` — ${preview.edition_year} ${preview.edition_title}`}
            </div>
          )}
          <div className="form-grid">
            <div className="form-row">
              <label>Artist</label>
              <input value={artist} onChange={(e) => setArtist(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Year</label>
              <input value={recordYear} onChange={(e) => setRecordYear(e.target.value)} type="number" />
            </div>
            <div className="form-row span2">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Edition year</label>
              <input value={editionYear} onChange={(e) => setEditionYear(e.target.value)} type="number" />
            </div>
            <div className="form-row">
              <label>Edition title</label>
              <input value={editionTitle} onChange={(e) => setEditionTitle(e.target.value)} />
            </div>
          </div>
          <ValuePickerMulti
            label="Media type"
            kind="media"
            values={mediaTags}
            options={facetValues(facets, "media")}
            onChange={setMediaTags}
          />
          <ValuePickerMulti
            label="Animation"
            kind="animation"
            values={animationTags}
            options={facetValues(facets, "animation")}
            onChange={setAnimationTags}
          />
          <ValuePickerMulti
            label="Canvas"
            kind="canvas"
            values={canvasTags}
            options={facetValues(facets, "canvas")}
            onChange={setCanvasTags}
          />
          <ValuePickerMulti
            label="Autographs"
            kind="autograph"
            values={autographTags}
            options={facetValues(facets, "autograph")}
            onChange={setAutographTags}
          />
          <ValuePickerSingle
            label="Pending"
            kind="pending"
            value={pending}
            options={[
              ...facetValues(facets, "pending"),
              "Spotify Code",
              "Everything",
            ]}
            onChange={setPending}
          />
          {showAutographPhoto && (
            <div className="form-row autograph-photo-section">
              <label>Autograph photo</label>
              <p className="autograph-photo-hint">
                Photos in your autographs folder are used automatically (matched by cover key).
                Upload below only when you need a custom image from another source.
              </p>
              {hasPhoto && autographSource && !pendingPhotoPreview && (
                <p className="autograph-photo-source">
                  {autographSource === "folder"
                    ? "Using photo from autographs folder"
                    : "Using custom uploaded photo"}
                </p>
              )}
              <div className="autograph-photo-row">
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
                  <div className="autograph-thumb empty">No photo</div>
                )}
                <div className="autograph-photo-actions">
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
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                  >
                    {autographSource === "upload" ? "Replace custom photo" : "Upload custom photo"}
                  </button>
                  {autographSource === "upload" && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handlePhotoRemove}
                      disabled={saving}
                    >
                      Remove custom photo
                    </button>
                  )}
                </div>
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
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
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
