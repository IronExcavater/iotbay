from dataclasses import dataclass

from src.access_logs.repository import AccessLogRepository
from src.addresses.google_maps_api import GoogleMapsApi
from src.addresses.service import AddressService
from src.audit.repository import AuditRepository
from src.audit.service import AuditService
from src.auth.service import AuthService
from src.cart.repository import CartRepository
from src.config import AddressConfig, AppConfig, EmailConfig
from src.emails.service import EmailService
from src.media.repository import MediaRepository
from src.orders.repository import OrderRepository
from src.orders.service import OrderService
from src.payment_methods.repository import PaymentMethodRepository
from src.payments.repository import PaymentRepository
from src.payments.service import PaymentService
from src.products.repository import ProductRepository
from src.products.service import ProductService
from src.users.repository import UserRepository


@dataclass(slots=True)
class AppServices:
    access_log_repository: AccessLogRepository
    cart_repository: CartRepository
    address: AddressService
    audit: AuditService
    audit_repository: AuditRepository
    auth: AuthService
    media_repository: MediaRepository
    products: ProductService
    product_repository: ProductRepository
    user_repository: UserRepository
    orders: OrderService
    order_repository: OrderRepository
    payment_method_repository: PaymentMethodRepository
    payment_repository: PaymentRepository
    payment_service: PaymentService


def build_app_services(
    *,
    address_config: AddressConfig,
    app_config: AppConfig,
    email_config: EmailConfig,
) -> AppServices:
    address_service = AddressService(GoogleMapsApi(address_config))
    access_log_repository = AccessLogRepository(app_config.database_path)
    cart_repository = CartRepository(app_config.database_path)
    audit_repository = AuditRepository(app_config.database_path)
    media_repository = MediaRepository(app_config.database_path)
    user_repository = UserRepository(app_config.database_path)
    product_repository = ProductRepository(app_config.database_path)
    order_repository = OrderRepository(app_config.database_path)
    payment_method_repository = PaymentMethodRepository(app_config.database_path)
    payment_repository = PaymentRepository(app_config.database_path)

    return AppServices(
        access_log_repository=access_log_repository,
        cart_repository=cart_repository,
        address=address_service,
        audit=AuditService(repository=audit_repository),
        audit_repository=audit_repository,
        auth=AuthService(
            access_log_repository=access_log_repository,
            address_service=address_service,
            audit=AuditService(repository=audit_repository),
            email_service=EmailService(email_config),
            login_mfa_lifetime_seconds=app_config.login_mfa_lifetime_seconds,
            media_repository=media_repository,
            password_reset_lifetime_seconds=900,
            session_lifetime_seconds=app_config.session_lifetime_seconds,
            trusted_session_lifetime_seconds=(
                app_config.trusted_session_lifetime_seconds
            ),
            user_repository=user_repository,
            verification_lifetime_seconds=app_config.verification_code_lifetime_seconds,
            web_url=app_config.web_url,
        ),
        products=ProductService(
            audit=AuditService(repository=audit_repository),
            media_repository=media_repository,
            repository=product_repository,
        ),
        media_repository=media_repository,
        product_repository=product_repository,
        orders=OrderService(
            audit=AuditService(repository=audit_repository),
            order_repository=order_repository,
            product_repository=product_repository,
            user_repository=user_repository,
        ),
        order_repository=order_repository,
        payment_method_repository=payment_method_repository,
        payment_repository=payment_repository,
        payment_service=PaymentService(
            payment_repository=payment_repository,
            order_repository=order_repository,
            payment_method_repository=payment_method_repository,  #  wired in
        ),
        user_repository=user_repository,
    )
