from dataclasses import dataclass

from src.addresses.google_maps_api import GoogleMapsApi
from src.addresses.service import AddressService
from src.auth.service import AuthService
from src.config import AddressConfig, AppConfig, EmailConfig
from src.emails.service import EmailService
from src.products.repository import ProductRepository
from src.products.service import ProductService
from src.users.repository import UserRepository


@dataclass(slots=True)
class AppServices:
    address: AddressService
    auth: AuthService
    products: ProductService
    product_repository: ProductRepository
    user_repository: UserRepository


def build_app_services(
    *,
    address_config: AddressConfig,
    app_config: AppConfig,
    email_config: EmailConfig,
) -> AppServices:
    address_service = AddressService(GoogleMapsApi(address_config))
    user_repository = UserRepository(app_config.database_path)
    product_repository = ProductRepository(app_config.database_path)

    return AppServices(
        address=address_service,
        auth=AuthService(
            address_service=address_service,
            email_service=EmailService(email_config),
            password_reset_lifetime_seconds=900,
            session_lifetime_seconds=app_config.session_lifetime_seconds,
            user_repository=user_repository,
            verification_lifetime_seconds=app_config.verification_code_lifetime_seconds,
            web_url=app_config.web_url,
        ),
        products=ProductService(repository=product_repository),
        product_repository=product_repository,
        user_repository=user_repository,
    )
