from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class RecordFields(BaseModel):
    artist: str
    record_year: int | None = None
    title: str
    edition_year: int | None = None
    edition_title: str | None = None
    pending_tags: list[str] = Field(default_factory=list)
    media_tags: list[str] = Field(default_factory=list)
    animation_tags: list[str] = Field(default_factory=list)
    canvas_tags: list[str] = Field(default_factory=list)
    autograph_tags: list[str] = Field(default_factory=list)
    release_type: str | None = None
    genre_tags: list[str] = Field(default_factory=list)
    country_tags: list[str] = Field(default_factory=list)


class RecordCreate(RecordFields):
    pass


class RecordUpdate(BaseModel):
    artist: str | None = None
    record_year: int | None = None
    title: str | None = None
    edition_year: int | None = None
    edition_title: str | None = None
    pending_tags: list[str] | None = None
    media_tags: list[str] | None = None
    animation_tags: list[str] | None = None
    canvas_tags: list[str] | None = None
    autograph_tags: list[str] | None = None
    release_type: str | None = None
    genre_tags: list[str] | None = None
    country_tags: list[str] | None = None


class MediaSideOut(BaseModel):
    has_file: bool = False
    url: str | None = None


class FlipCardAssetsOut(BaseModel):
    front: MediaSideOut = Field(default_factory=MediaSideOut)
    back: MediaSideOut = Field(default_factory=MediaSideOut)


class RecordAssetsOut(BaseModel):
    canvas: MediaSideOut = Field(default_factory=MediaSideOut)
    spotify: FlipCardAssetsOut = Field(default_factory=FlipCardAssetsOut)
    landscape_card: FlipCardAssetsOut = Field(default_factory=FlipCardAssetsOut)
    portrait_card: FlipCardAssetsOut = Field(default_factory=FlipCardAssetsOut)


class RecordOut(RecordFields):
    cover_key: str
    id: int
    has_cover: bool = False
    cover_url: str | None = None
    has_autograph_photo: bool = False
    autograph_photo_url: str | None = None
    autograph_photo_source: str | None = None
    has_animation_file: bool = False
    animation_url: str | None = None
    animation_files: list[bool] = Field(default_factory=list)
    has_canvas_file: bool = False
    canvas_url: str | None = None
    canvas_files: list[bool] = Field(default_factory=list)
    assets: RecordAssetsOut = Field(default_factory=RecordAssetsOut)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FacetOption(BaseModel):
    value: str
    count: int


class FacetsOut(BaseModel):
    media: list[FacetOption]
    animation: list[FacetOption]
    canvas: list[FacetOption]
    autograph: list[FacetOption]
    pending: list[FacetOption]
    release_type: list[FacetOption]
    genre: list[FacetOption]
    country: list[FacetOption]
    artist: list[FacetOption]


class RecordListOut(BaseModel):
    items: list[RecordOut]
    total: int
    record_total: int
    page: int
    page_size: int


class SettingsOut(BaseModel):
    source_folder: str = ""
    covers_folder: str = ""
    animations_folder: str = ""
    autographs_folder: str = ""


class SettingsUpdate(BaseModel):
    source_folder: str | None = None
    covers_folder: str | None = None
    animations_folder: str | None = None
    autographs_folder: str | None = None


class BrowseResult(BaseModel):
    path: str
    selected: bool = False


class SourceFolderBrowseResult(BaseModel):
    path: str
    selected: bool = False
    missing_subfolders: list[str] = Field(default_factory=list)


class ImportResult(BaseModel):
    imported: int
    updated: int
    skipped: int
    errors: list[str]


class ParsePreview(BaseModel):
    cover_key: str
    artist: str
    record_year: int | None
    title: str
    edition_year: int | None = None
    edition_title: str | None = None


class AudioTrackOut(BaseModel):
    index: int
    track_number: str | None = None
    title: str
    disc: str | None = None
    url: str


class AudioTracksOut(BaseModel):
    tracks: list[AudioTrackOut] = Field(default_factory=list)


class ArtworkImageOut(BaseModel):
    index: int
    title: str
    url: str


class ArtworkListOut(BaseModel):
    images: list[ArtworkImageOut] = Field(default_factory=list)
