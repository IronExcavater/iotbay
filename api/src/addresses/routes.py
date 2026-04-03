from flask import Blueprint, request
from src.addresses.google_maps_api import AddressServiceUnavailableError
from src.addresses.service import AddressService
from src.common.app import app_extension

addresses_bp = Blueprint("addresses", __name__)


@addresses_bp.get("/addresses/suggest")
def suggest_addresses():
    query = request.args.get("q", "").strip()
    if len(query) < 3:
        return {"items": []}, 200

    service = app_extension("address_service", AddressService)
    try:
        items = [
            item.to_dict()
            for item in service.suggest(
                query=query,
                country=request.args.get("country"),
                language=request.args.get("language"),
            )
        ]
    except AddressServiceUnavailableError:
        return {"items": []}, 200
    return {"items": items}, 200


@addresses_bp.get("/addresses/resolve")
def resolve_address():
    place_id = request.args.get("id", "").strip()
    if not place_id:
        return {"error": "address id is required", "code": "ADDRESS_INVALID"}, 400

    service = app_extension("address_service", AddressService)
    address = service.resolve(
        place_id=place_id,
        country=request.args.get("country"),
        language=request.args.get("language"),
    )
    return {"address": address.to_dict()}, 200
