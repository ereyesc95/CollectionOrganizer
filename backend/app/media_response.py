"""File responses for cover/animation assets with browser-friendly caching."""

from pathlib import Path

from fastapi.responses import FileResponse

AUDIO_MEDIA_TYPES = {
    ".mp3": "audio/mpeg",
    ".flac": "audio/flac",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".opus": "audio/opus",
}


def cached_media_file(path: Path, *, media_type: str | None = None) -> FileResponse:
    stat = path.stat()
    etag = f'"{int(stat.st_mtime)}-{stat.st_size}"'
    if media_type is None:
        media_type = AUDIO_MEDIA_TYPES.get(path.suffix.lower())
    return FileResponse(
        path,
        media_type=media_type,
        headers={
            "Cache-Control": "private, max-age=604800, immutable",
            "ETag": etag,
        },
    )
