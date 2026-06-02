"""File responses for cover/animation assets with browser-friendly caching."""

from pathlib import Path

from fastapi.responses import FileResponse


def cached_media_file(path: Path) -> FileResponse:
    stat = path.stat()
    etag = f'"{int(stat.st_mtime)}-{stat.st_size}"'
    return FileResponse(
        path,
        headers={
            "Cache-Control": "private, max-age=604800, immutable",
            "ETag": etag,
        },
    )
