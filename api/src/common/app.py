from typing import TypeVar, cast

from flask import Flask, current_app

TAppExtension = TypeVar("TAppExtension")


def app_extension(name: str, expected_type: type[TAppExtension]) -> TAppExtension:
    return extension_from(current_app, name, expected_type)


def extension_from(
    app: Flask,
    name: str,
    expected_type: type[TAppExtension],
) -> TAppExtension:
    value = app.extensions.get(name)
    if not isinstance(value, expected_type):
        raise RuntimeError(f"{name} is not configured")
    return cast(TAppExtension, value)


def app_bool(name: str) -> bool:
    return bool(current_app.config[name])


def app_int(name: str) -> int:
    return int(current_app.config[name])


def app_str(name: str) -> str:
    return str(current_app.config[name])
