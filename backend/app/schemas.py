from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class RecordBase(BaseModel):
    cover_key: str
    artist: str
    record_year: int | None = None
    title: str
    edition_year: int | None = None
    edition_title: str | None = None
    pending: str | None = None
    media_tags: list[str] = Field(default_factory=list)
    animation_tags: list[str] = Field(default_factory=list)
    canvas_tags: list[str] = Field(default_factory=list)
    autograph_tags: list[str] = Field(default_factory=list)


class RecordCreate(RecordBase):
    pass


class RecordUpdate(BaseModel):
    cover_key: str | None = None
    artist: str | None = None
    record_year: int | None = None
    title: str | None = None
    edition_year: int | None = None
    edition_title: str | None = None
    pending: str | None = None
    media_tags: list[str] | None = None
    animation_tags: list[str] | None = None
    canvas_tags: list[str] | None = None
    autograph_tags: list[str] | None = None


class RecordOut(RecordBase):
    id: int
    has_cover: bool = False
    cover_url: str | None = None
    has_autograph_photo: bool = False
    autograph_photo_url: str | None = None
    autograph_photo_source: str | None = None
    has_animation_file: bool = False
    animation_url: str | None = None
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


class RecordListOut(BaseModel):
    items: list[RecordOut]
    total: int
    page: int
    page_size: int


class SettingsOut(BaseModel):
    covers_folder: str
    animations_folder: str
    autographs_folder: str


class SettingsUpdate(BaseModel):
    covers_folder: str | None = None
    animations_folder: str | None = None
    autographs_folder: str | None = None


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
