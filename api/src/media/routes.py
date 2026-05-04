import uuid
from http import HTTPStatus

from flask import Blueprint, Response
from src.common.app import services
from src.common.web import ApiError

media_bp = Blueprint("media", __name__)


class InvalidMediaIdError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "media id is invalid",
            HTTPStatus.BAD_REQUEST,
            code="MEDIA_ID_INVALID",
        )


@media_bp.get("/media/<media_id>")
def get_media(media_id: str) -> Response:
    asset = services().media_repository.select_media_asset(
        media_asset_id=_parse_media_id(media_id),
    )
    if asset is None:
        raise ApiError(
            "media was not found",
            HTTPStatus.NOT_FOUND,
            code="MEDIA_NOT_FOUND",
        )
    return Response(asset.data, mimetype=asset.content_type)


def _parse_media_id(value: str) -> bytes:
    try:
        return uuid.UUID(value).bytes
    except ValueError as error:
        raise InvalidMediaIdError() from error
