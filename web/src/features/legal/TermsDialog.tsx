import { Button } from '@shared/ui/form/Button';
import { OverlayDialog } from '@shared/ui/overlay/OverlayDialog';

export function TermsDialog({
    onAccept,
    onClose,
}: {
    onAccept?: () => void;
    onClose: () => void;
}) {
    return (
        <OverlayDialog
            className="max-w-3xl"
            onClose={onClose}
            title="Terms and conditions"
        >
            <div className="grid gap-5 text-sm leading-6">
                <p className="text-ui-600">
                    These terms apply when you browse IoTBay, create an account,
                    maintain profile information, place orders, or use the staff
                    catalogue and order tools. They are written for this
                    application and follow the practical structure common to
                    marketplace, ecommerce, and account-based retail sites.
                </p>

                <TermsSection title="Accounts and security">
                    You must provide current and accurate registration, contact,
                    and delivery information. You are responsible for activity
                    under your account, keeping your password confidential, and
                    telling us promptly if you suspect unauthorised access. We
                    may suspend access where we reasonably believe an account is
                    being misused, has compromised credentials, or is being used
                    to interfere with the service.
                </TermsSection>

                <TermsSection title="Catalogue information">
                    Product names, codes, descriptions, images, prices, stock
                    counts, and availability notices are provided from the
                    current catalogue records. We try to keep this information
                    accurate, but catalogue details can change before checkout.
                    Images may be representative where a supplier image or
                    product render is used.
                </TermsSection>

                <TermsSection title="Orders and acceptance">
                    Submitting an order is an offer to purchase the selected
                    items at the displayed price and quantity. An order is not
                    final until the application records it and confirms it in
                    your order history. We may reject, cancel, or correct an
                    order if pricing, stock, address, payment, or account
                    information is invalid or if fulfilment is unavailable.
                </TermsSection>

                <TermsSection title="Prices, payment, and taxes">
                    Prices are shown in Australian dollars. Any displayed total
                    is calculated from item prices, quantities, and applicable
                    delivery charges shown at checkout. Payment details must be
                    valid, authorised for use by you, and pass the validation
                    rules in the checkout form. This project records order
                    intent only and does not store full card numbers.
                </TermsSection>

                <TermsSection title="Delivery information">
                    Delivery estimates depend on the address and products in the
                    order. You are responsible for checking the shipping address
                    before placing an order. We may contact you, delay dispatch,
                    or cancel an order if the address is incomplete, invalid, or
                    outside the supported delivery area.
                </TermsSection>

                <TermsSection title="Returns, cancellations, and support">
                    Orders that are still saved and not paid or fulfilled may be
                    cancelled from the order screen where the application allows
                    it. For paid or dispatched orders, return and refund
                    handling depends on product condition, supplier
                    requirements, and consumer law obligations that cannot be
                    excluded.
                </TermsSection>

                <TermsSection title="Privacy and records">
                    We use account, contact, address, cart, order, and access
                    log information to operate the site, secure accounts,
                    maintain audit history, and support customer or staff
                    workflows. We do not ask for more information than the app
                    needs for these purposes.
                </TermsSection>

                <TermsSection title="Acceptable use">
                    You must not attempt to bypass authentication, access staff
                    functions without permission, upload malicious files, tamper
                    with prices or order data, scrape the service at excessive
                    volume, or use the application in a way that disrupts other
                    users.
                </TermsSection>

                <TermsSection title="Changes">
                    We may update these terms as the catalogue, ordering, user
                    account, and staff administration features change. The terms
                    shown in this dialog are the version presented when you
                    accept them in the relevant form.
                </TermsSection>

                {onAccept && (
                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={() => {
                                onAccept();
                                onClose();
                            }}
                            type="button"
                            variant="primary"
                        >
                            Accept terms
                        </Button>
                    </div>
                )}
            </div>
        </OverlayDialog>
    );
}

function TermsSection({
    children,
    title,
}: {
    children: string;
    title: string;
}) {
    return (
        <section className="grid gap-1.5">
            <h3 className="text-ui-900 text-base font-semibold">{title}</h3>
            <p className="text-ui-600">{children}</p>
        </section>
    );
}
