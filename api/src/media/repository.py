import base64
import re
import sqlite3
from dataclasses import dataclass, field

from src.common.clock import UtcTime
from src.common.repository import Repository
from src.common.sqlite_model import BlobUuidModel, SqliteRowModel, new_id_bytes

DATA_IMAGE_PATTERN = re.compile(r"^data:(image/[a-zA-Z0-9.+-]+);base64,(.+)$", re.S)
MAX_MEDIA_BYTES = 2_000_000


@dataclass(slots=True, frozen=True)
class MediaAsset(SqliteRowModel, BlobUuidModel):
    content_type: str
    data: bytes
    created_at: str
    media_asset_id: bytes = field(default_factory=new_id_bytes)

    @classmethod
    def uuid_field_name(cls) -> str:
        return "media_asset_id"


class InvalidMediaDataError(ValueError):
    pass


class MediaRepository(Repository):
    def insert_media_asset(
        self,
        connection: sqlite3.Connection,
        *,
        content_type: str,
        data: bytes,
    ) -> MediaAsset:
        if len(data) > MAX_MEDIA_BYTES:
            raise InvalidMediaDataError("image is too large")

        asset = MediaAsset(
            content_type=content_type,
            data=data,
            created_at=UtcTime.now().iso,
        )
        self.insert_into(
            connection,
            "media_assets",
            {
                "media_asset_id": asset.media_asset_id,
                "content_type": asset.content_type,
                "data": asset.data,
                "created_at": asset.created_at,
            },
        )
        return asset

    def select_media_asset(self, *, media_asset_id: bytes) -> MediaAsset | None:
        with self.connect() as connection:
            row = connection.execute(
                "SELECT * FROM media_assets WHERE media_asset_id = ?",
                (media_asset_id,),
            ).fetchone()
        return MediaAsset.from_row(row) if row is not None else None

    def store_data_url(
        self,
        connection: sqlite3.Connection,
        *,
        data_url: str,
    ) -> str:
        match = DATA_IMAGE_PATTERN.match(data_url.strip())
        if match is None:
            raise InvalidMediaDataError("image data is invalid")

        content_type = match.group(1).lower()
        try:
            data = base64.b64decode(match.group(2), validate=True)
        except ValueError as error:
            raise InvalidMediaDataError("image data is invalid") from error

        asset = self.insert_media_asset(
            connection,
            content_type=content_type,
            data=data,
        )
        return f"/api/media/{asset.id}"


def is_data_image_url(value: str | None) -> bool:
    return bool(value and DATA_IMAGE_PATTERN.match(value.strip()))
