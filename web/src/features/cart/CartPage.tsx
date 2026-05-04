import { useEffect, useMemo, useState } from 'react';
import { FaCartShopping, FaTrashCan } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import {
    DEFAULT_PROFILE_VALUES,
    toProfileUpdateInput,
    toProfileValues,
} from '@features/account/profileForm';
import { AddressFields } from '@features/addresses/AddressFields';
import {
    setAddressField,
    validateAddressValues,
    type AddressFieldErrors,
    type AddressFieldName,
} from '@features/addresses/form';
import { useAuth } from '@features/auth/AuthProvider';
import { useCart } from '@features/cart/CartProvider';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { Button, ButtonLink } from '@shared/ui/form/Button';
import { Checkbox } from '@shared/ui/form/Checkbox';
import { TextLink } from '@shared/ui/form/TextLink';
import { PageHeader } from '@shared/ui/PageHeader';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { AddressText } from '@shared/value-objects/AddressText';
import { Money } from '@shared/value-objects/Money';

export default function CartPage() {
    useDocumentTitle('Cart');
    const { updateMe, user } = useAuth();
    const { clearCart, items, removeFromCart } = useCart();
    const { showToast } = useToast();
    const [addressValues, setAddressValues] = useState(DEFAULT_PROFILE_VALUES);
    const [initialAddressValues, setInitialAddressValues] = useState(
        DEFAULT_PROFILE_VALUES
    );
    const [addressErrors, setAddressErrors] = useState<AddressFieldErrors>({});
    const [acceptedTerms, setAcceptedTerms] = useState(false);
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
        () => items.reduce((sum, item) => sum + item.priceCents, 0),
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
            clearCart();
            showToast('Order details confirmed');
        } catch {
            showToast('Unable to save order details');
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

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                <section className="bg-ui-0 border-ui-200 overflow-hidden rounded border">
                    <div className="border-ui-200 flex items-center justify-between gap-3 border-b px-5 py-4">
                        <h2 className="text-ui-900 text-xl font-semibold">
                            Items
                        </h2>
                        {items.length > 0 && (
                            <Button
                                onClick={clearCart}
                                type="button"
                                variant="ghost"
                            >
                                Clear cart
                            </Button>
                        )}
                    </div>

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
                        <ul className="divide-ui-200 divide-y">
                            {items.map((item) => (
                                <li
                                    className="grid gap-4 px-5 py-4 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-center"
                                    key={item.productId}
                                >
                                    <div className="bg-ui-100 border-ui-200 aspect-square overflow-hidden rounded border">
                                        <img
                                            alt=""
                                            className="h-full w-full object-cover"
                                            src={
                                                item.imageUrl ??
                                                '/iotbay_icon_themed.svg'
                                            }
                                        />
                                    </div>
                                    <div className="grid min-w-0 gap-1">
                                        {item.code && (
                                            <span className="text-ui-500 font-mono text-xs">
                                                {item.code}
                                            </span>
                                        )}
                                        <Link
                                            className="text-ui-900 w-fit truncate font-medium underline-offset-4 outline-none hover:underline focus-visible:underline"
                                            to={`/products/${item.productId}`}
                                        >
                                            {item.name}
                                        </Link>
                                        <span className="text-ui-500 text-sm">
                                            Quantity 1
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                                        <span className="text-ui-900 font-semibold">
                                            {Money.format(item.priceCents)}
                                        </span>
                                        <Button
                                            aria-label={`Remove ${item.name}`}
                                            className="inline-flex size-9 rounded-full p-0"
                                            onClick={() =>
                                                removeFromCart(item.productId)
                                            }
                                            type="button"
                                            variant="ghost"
                                        >
                                            <FaTrashCan
                                                aria-hidden="true"
                                                className="size-3.5"
                                            />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <aside className="bg-ui-0 border-ui-200 grid gap-5 rounded border p-5 lg:sticky lg:top-24">
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

                    <div className="grid gap-2">
                        <h3 className="text-ui-700 text-sm font-semibold tracking-[0.08em] uppercase">
                            Delivery address
                        </h3>
                        {user && isCustomer ? (
                            <AddressFields
                                countryCode={addressValues.phoneCountry}
                                errors={addressErrors}
                                onFieldChange={handleAddressFieldChange}
                                values={addressValues}
                            />
                        ) : user ? (
                            <p className="text-ui-500 text-sm">
                                Orders can only be placed from a customer
                                account.
                            </p>
                        ) : (
                            <p className="text-ui-500 text-sm">
                                Sign in to add a delivery address and place an
                                order.
                            </p>
                        )}
                    </div>

                    <Checkbox
                        checked={acceptedTerms}
                        className="items-start"
                        onChange={setAcceptedTerms}
                    >
                        I agree to the{' '}
                        <TextLink to="/terms">terms and conditions</TextLink>.
                    </Checkbox>

                    {!hasSelectedAddress && user && isCustomer && (
                        <p className="text-ui-500 text-sm">
                            Enter a delivery address before ordering.
                        </p>
                    )}

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
