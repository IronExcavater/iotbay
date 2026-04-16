from flask import Blueprint
from src.addresses.google_maps_api import AddressServiceUnavailableError
from src.addresses.requests import AddressResolveQuery, AddressSuggestQuery
from src.common.app import services
from src.common.web import parse_query

addresses_bp = Blueprint("addresses", __name__)


@addresses_bp.get("/addresses/suggest")
def suggest_addresses():
    query = parse_query(AddressSuggestQuery)
    if len(query.q) < 3:
        return {"items": []}, 200

    try:
        items = [
            item.to_dict()
            for item in services().address.suggest(
                query=query.q,
                country=query.country or None,
                language=query.language or None,
            )
        ]
    except AddressServiceUnavailableError:
        return {"items": []}, 200
    return {"items": items}, 200


@addresses_bp.get("/addresses/resolve")
def resolve_address():
    query = parse_query(AddressResolveQuery)
    if not query.id:
        return {"error": "address id is required", "code": "ADDRESS_INVALID"}, 400

    address = services().address.resolve(
        place_id=query.id,
        country=query.country or None,
        language=query.language or None,
    )
    return {"address": address.to_dict()}, 200
