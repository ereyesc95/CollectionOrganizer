from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Record(Base):
    __tablename__ = "records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cover_key: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    artist: Mapped[str] = mapped_column(String(256), index=True)
    record_year: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(512), index=True)
    edition_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    edition_title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    release_type: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    pending: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    media_tags: Mapped[list[RecordMediaTag]] = relationship(
        back_populates="record", cascade="all, delete-orphan"
    )
    animation_tags: Mapped[list[RecordAnimationTag]] = relationship(
        back_populates="record", cascade="all, delete-orphan"
    )
    canvas_tags: Mapped[list[RecordCanvasTag]] = relationship(
        back_populates="record", cascade="all, delete-orphan"
    )
    autograph_tags: Mapped[list[RecordAutographTag]] = relationship(
        back_populates="record", cascade="all, delete-orphan"
    )
    pending_tags: Mapped[list[RecordPendingTag]] = relationship(
        back_populates="record", cascade="all, delete-orphan"
    )
    genre_tags: Mapped[list[RecordGenreTag]] = relationship(
        back_populates="record", cascade="all, delete-orphan"
    )
    country_tags: Mapped[list[RecordCountryTag]] = relationship(
        back_populates="record", cascade="all, delete-orphan"
    )


class RecordMediaTag(Base):
    __tablename__ = "record_media_tags"
    __table_args__ = (UniqueConstraint("record_id", "tag", name="uq_media_tag"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id", ondelete="CASCADE"))
    tag: Mapped[str] = mapped_column(String(32), index=True)
    record: Mapped[Record] = relationship(back_populates="media_tags")


class RecordAnimationTag(Base):
    __tablename__ = "record_animation_tags"
    __table_args__ = (UniqueConstraint("record_id", "tag", name="uq_animation_tag"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id", ondelete="CASCADE"))
    tag: Mapped[str] = mapped_column(String(64), index=True)
    record: Mapped[Record] = relationship(back_populates="animation_tags")


class RecordCanvasTag(Base):
    __tablename__ = "record_canvas_tags"
    __table_args__ = (UniqueConstraint("record_id", "tag", name="uq_canvas_tag"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id", ondelete="CASCADE"))
    tag: Mapped[str] = mapped_column(String(64), index=True)
    record: Mapped[Record] = relationship(back_populates="canvas_tags")


class RecordAutographTag(Base):
    __tablename__ = "record_autograph_tags"
    __table_args__ = (UniqueConstraint("record_id", "tag", name="uq_autograph_tag"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id", ondelete="CASCADE"))
    tag: Mapped[str] = mapped_column(String(128), index=True)
    record: Mapped[Record] = relationship(back_populates="autograph_tags")


class RecordPendingTag(Base):
    __tablename__ = "record_pending_tags"
    __table_args__ = (UniqueConstraint("record_id", "tag", name="uq_pending_tag"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id", ondelete="CASCADE"))
    tag: Mapped[str] = mapped_column(String(64), index=True)
    record: Mapped[Record] = relationship(back_populates="pending_tags")


class RecordGenreTag(Base):
    __tablename__ = "record_genre_tags"
    __table_args__ = (UniqueConstraint("record_id", "tag", name="uq_genre_tag"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id", ondelete="CASCADE"))
    tag: Mapped[str] = mapped_column(String(64), index=True)
    record: Mapped[Record] = relationship(back_populates="genre_tags")


class RecordCountryTag(Base):
    __tablename__ = "record_country_tags"
    __table_args__ = (UniqueConstraint("record_id", "tag", name="uq_country_tag"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id", ondelete="CASCADE"))
    tag: Mapped[str] = mapped_column(String(64), index=True)
    record: Mapped[Record] = relationship(back_populates="country_tags")


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
