import { useEffect, useMemo, useState } from 'react';
import { FaCartShopping, FaTrashCan } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import {
    DEFAULT_PROFILE_VALUES,
    toProfileUpdateInput,
    toProfileValues,
} from '@features/account/form';
import { AddressFields } from '@features/addresses/components/AddressFields';
import {
    setAddressField,
    validateAddressValues,
    type AddressFieldErrors,
    type AddressFieldName,
} from '@features/addresses/form';
import { useAuth } from '@features/auth/AuthProvider';
import { useCart } from '@features/cart/CartProvider';
import { CartQuantityControl } from '@features/cart/components/CartQuantityControl';
import { TermsDialog } from '@features/legal/TermsDialog';
import { orderApi } from '@features/orders/api';
import { PaymentMethodsSection } from '@features/payment-methods/components/PaymentMethodsSection';
import { ProductRow } from '@features/products/components/ProductRow';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { Button, ButtonLink } from '@shared/ui/form/Button';
import { Checkbox } from '@shared/ui/form/Checkbox';
import { TextButton } from '@shared/ui/form/TextLink';
import { PageHeader } from '@shared/ui/PageHeader';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { AddressText } from '@shared/value-objects/AddressText';
import { Money } from '@shared/value-objects/Money';

export default function CartPage() {
    useDocumentTitle('Cart');
    const { updateMe, user } = useAuth();
    const { clearCart, items, removeFromCart, setItemQuantity } = useCart();
    const { showToast } = useToast();
    const [addressValues, setAddressValues] = useState(DEFAULT_PROFILE_VALUES);
    const [initialAddressValues, setInitialAddressValues] = useState(
        DEFAULT_PROFILE_VALUES
    );
    const [addressErrors, setAddressErrors] = useState<AddressFieldErrors>({});
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [isOrdering, setIsOrdering] = useState(false);

    useEffect(() => {
        const nextValues = user
            ? toProfileValues(user)
            : DEFAULT_PROFILE_VALUES;
        setAddressValues(nextValues);
        setInitialAddressValues(nextValues);
        setAddressErrors({});
    }, [user]);

    const subtotalCents = useMemo(
        () =>
            items.reduce(
                (sum, item) => sum + item.priceCents * item.quantity,
                0
            ),
        [items]
    );
    const deliveryCents = items.length > 0 ? 1200 : 0;
    const totalCents = subtotalCents + deliveryCents;
    const hasSelectedAddress = AddressText.hasSelectedAddress(addressValues);
    const isCustomer = user?.userType === 'customer';
    const addressChanged = hasAddressChanged(
        addressValues,
        initialAddressValues
    );
    const canOrder =
        items.length > 0 &&
        Boolean(user) &&
        isCustomer &&
        hasSelectedAddress &&
        acceptedTerms;

    function handleAddressFieldChange(name: AddressFieldName, value: string) {
        setAddressValues((current) => setAddressField(current, name, value));
    }

    const navigate = useNavigate();

    async function handleOrder() {
        const nextAddressErrors = validateAddressValues(addressValues, true);
        setAddressErrors(nextAddressErrors);
        if (
            !canOrder ||
            Object.values(nextAddressErrors).some(Boolean) ||
            !user
        )
            return;

        setIsOrdering(true);
        try {
            if (addressChanged) {
                await updateMe(
                    toProfileUpdateInput(addressValues, {
                        emailChanged: false,
                        isCustomer: true,
                        isStaff: false,
                    })
                );
            }

            const order = await orderApi.create({
                addressId: null,
                items: items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                })),
            });

            clearCart();
            navigate(`/checkout?orderId=${order.id}`);
        } catch {
            showToast('Unable to place order');
        } finally {
            setIsOrdering(false);
        }
    }

    return (
        <section className="grid gap-6">
            <PageHeader
                description="Check the items, delivery address, and total before placing your order."
                title="Cart"
            />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_30rem] xl:items-start">
                <section className="bg-ui-0 border-ui-200 overflow-hidden rounded border">
                    {items.length === 0 ? (
                        <div className="grid justify-items-center gap-3 px-5 py-12 text-center">
                            <FaCartShopping
                                aria-hidden="true"
                                className="text-ui-300 size-8"
                            />
                            <p className="text-ui-500 text-sm">
                                Your cart is empty.
                            </p>
                            <ButtonLink to="/products" variant="secondary">
                                Browse catalogue
                            </ButtonLink>
                        </div>
                    ) : (
                        <>
                            <ul className="divide-ui-200 divide-y">
                                {items.map((item) => (
                                    <li key={item.productId}>
                                        <ProductRow
                                            code={item.code}
                                            imageUrl={
                                                item.imageUrl ??
                                                '/iotbay_icon_themed.svg'
                                            }
                                            name={item.name}
                                            productId={item.productId}
                                            middle={
                                                <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                                    <span className="text-ui-900 font-semibold">
                                                        {Money.format(
                                                            item.priceCents *
                                                                item.quantity
                                                        )}
                                                    </span>
                                                    {item.quantity > 1 && (
                                                        <span className="text-ui-400 text-xs">
                                                            {item.quantity}{' '}
                                                            &times;{' '}
                                                            {Money.format(
                                                                item.priceCents
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            }
                                            right={
                                                <div className="flex items-center gap-2">
                                                    <CartQuantityControl
                                                        label={item.name}
                                                        onChange={(q) =>
                                                            setItemQuantity(
                                                                item.productId,
                                                                q
                                                            )
                                                        }
                                                        value={item.quantity}
                                                    />
                                                    <button
                                                        aria-label={`Remove ${item.name}`}
                                                        className="text-ui-400 flex size-8 items-center justify-center rounded transition-colors outline-none hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500"
                                                        onClick={() =>
                                                            removeFromCart(
                                                                item.productId
                                                            )
                                                        }
                                                        type="button"
                                                    >
                                                        <FaTrashCan
                                                            aria-hidden="true"
                                                            className="size-3.5"
                                                        />
                                                    </button>
                                                </div>
                                            }
                                        />
                                    </li>
                                ))}
                            </ul>
                            <div className="border-ui-200 flex justify-end border-t px-4 py-2.5">
                                <button
                                    className="text-ui-400 text-xs transition-colors outline-none hover:text-red-600 focus-visible:underline"
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                'Remove all items from cart?'
                                            )
                                        )
                                            clearCart();
                                    }}
                                    type="button"
                                >
                                    Clear cart
                                </button>
                            </div>
                        </>
                    )}
                </section>

                <aside className="bg-ui-0 border-ui-200 grid gap-5 rounded border p-5 xl:sticky xl:top-6">
                    <div className="grid gap-3">
                        <h2 className="text-ui-900 text-xl font-semibold">
                            Order
                        </h2>
                        <div className="grid gap-2 text-sm">
                            <SummaryRow
                                label="Subtotal"
                                value={Money.format(subtotalCents)}
                            />
                            <SummaryRow
                                label="Delivery"
                                value={
                                    items.length > 0
                                        ? Money.format(deliveryCents)
                                        : Money.format(0)
                                }
                            />
                            <div className="border-ui-200 mt-1 flex justify-between border-t pt-3 text-base font-semibold">
                                <span>Total</span>
                                <span>{Money.format(totalCents)}</span>
                            </div>
                        </div>
                    </div>

                    {user && isCustomer ? (
                        <>
                            <div className="grid gap-2">
                                <h3 className="text-ui-700 text-sm font-semibold tracking-[0.08em] uppercase">
                                    Delivery address
                                </h3>
                                <AddressFields
                                    countryCode={addressValues.phoneCountry}
                                    errors={addressErrors}
                                    onFieldChange={handleAddressFieldChange}
                                    values={addressValues}
                                />
                            </div>

                            <PaymentMethodsSection />

                            <Checkbox
                                checked={acceptedTerms}
                                className="items-start"
                                onChange={(checked) => {
                                    if (checked) {
                                        setIsTermsOpen(true);
                                    } else {
                                        setAcceptedTerms(false);
                                    }
                                }}
                            >
                                I agree to the{' '}
                                <TextButton
                                    onClick={() => setIsTermsOpen(true)}
                                >
                                    terms and conditions
                                </TextButton>
                                .
                            </Checkbox>

                            {!hasSelectedAddress && (
                                <p className="text-ui-500 text-sm">
                                    Enter a delivery address before ordering.
                                </p>
                            )}
                        </>
                    ) : user ? (
                        <p className="text-ui-500 text-sm">
                            Orders can only be placed from a customer account.
                        </p>
                    ) : null}

                    {user ? (
                        <Button
                            disabled={!canOrder || isOrdering}
                            loading={isOrdering}
                            onClick={() => void handleOrder()}
                            type="button"
                            variant="primary"
                        >
                            Place order
                        </Button>
                    ) : (
                        <ButtonLink to="/sign-in?next=/cart">
                            Sign in to order
                        </ButtonLink>
                    )}
                </aside>
            </div>
            {isTermsOpen && (
                <TermsDialog
                    onAccept={() => setAcceptedTerms(true)}
                    onClose={() => setIsTermsOpen(false)}
                />
            )}
        </section>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="text-ui-600 flex justify-between gap-3">
            <span>{label}</span>
            <span className="text-ui-900">{value}</span>
        </div>
    );
}

function hasAddressChanged(
    current: typeof DEFAULT_PROFILE_VALUES,
    initial: typeof DEFAULT_PROFILE_VALUES
) {
    return (
        current.addressLineOne !== initial.addressLineOne ||
        current.addressLineTwo !== initial.addressLineTwo ||
        current.suburb !== initial.suburb ||
        current.state !== initial.state ||
        current.postcode !== initial.postcode ||
        current.country !== initial.country
    );
}
