from typing import TypeVar, cast

from flask import Flask, current_app
from src.app_services import AppServices

TAppExtension = TypeVar("TAppExtension")
APP_SERVICES_EXTENSION = "services"
LEGACY_SERVICE_ALIASES = {
    "address_service": "address",
    "auth_service": "auth",
    "product_service": "products",
    "product_repository": "product_repository",
    "user_repository": "user_repository",
}


def app_extension(name: str, expected_type: type[TAppExtension]) -> TAppExtension:
    return extension_from(current_app, name, expected_type)


def extension_from(
    app: Flask,
    name: str,
    expected_type: type[TAppExtension],
) -> TAppExtension:
    value = app.extensions.get(name)
    if not isinstance(value, expected_type):
        service_name = LEGACY_SERVICE_ALIASES.get(name)
        if service_name is not None:
            typed_value = getattr(services_from(app), service_name, None)
            if isinstance(typed_value, expected_type):
                return cast(TAppExtension, typed_value)
        raise RuntimeError(f"{name} is not configured")
    return cast(TAppExtension, value)


def services() -> AppServices:
    return services_from(current_app)


def services_from(app: Flask) -> AppServices:
    value = app.extensions.get(APP_SERVICES_EXTENSION)
    if not isinstance(value, AppServices):
        raise RuntimeError("services is not configured")
    return value


def app_bool(name: str) -> bool:
    return bool(current_app.config[name])


def app_int(name: str) -> int:
    return int(current_app.config[name])


def app_str(name: str) -> str:
    return str(current_app.config[name])
