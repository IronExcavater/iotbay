import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
    FaArrowLeft,
    FaChevronLeft,
    FaChevronRight,
    FaCheck,
    FaPenToSquare,
} from 'react-icons/fa6';
import { useNavigate, useParams } from 'react-router-dom';

import { AuditTimeline } from '@features/audit/components/AuditTimeline';
import { useEntityAudit } from '@features/audit/useEntityAudit';
import { useCart } from '@features/cart/CartProvider';
import { ProductFormDialog } from '@features/products/admin/components/ProductFormDialog';
import { productApi, type Product } from '@features/products/api';
import {
    assessProductForm,
    toProductErrorState,
    toProductFormValues,
    type ProductFieldErrors,
    type ProductFormValues,
} from '@features/products/form';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { useFormattedInput } from '@shared/hooks/useFormattedInput';
import { toErrorMessage } from '@shared/services/http';
import { Button } from '@shared/ui/form/Button';
import { IconButton } from '@shared/ui/form/IconButton';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { Money } from '@shared/value-objects/Money';
import { ProductCode, ProductName } from '@shared/value-objects/ProductText';

export default function ProductDetailPage({
    admin = false,
}: {
    admin?: boolean;
}) {
    const navigate = useNavigate();
    const { productId = '' } = useParams();
    const { showToast } = useToast();
    const { addToCart, isInCart, removeFromCart } = useCart();
    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
    const [pageError, setPageError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
    const [formValues, setFormValues] = useState<ProductFormValues>({
        code: '',
        mediaUrls: [],
        name: '',
        price: '',
    });
    const audit = useEntityAudit({
        entityId: productId,
        entityType: 'product',
    });
    useDocumentTitle(product?.name ?? 'Product');
    const nameInput = useFormattedInput({
        onChange: (value) =>
            setFormValues((current) => ({ ...current, name: value })),
        value: formValues.name,
        valueType: ProductName,
    });
    const codeInput = useFormattedInput({
        onChange: (value) =>
            setFormValues((current) => ({ ...current, code: value })),
        value: formValues.code,
        valueType: ProductCode,
    });
    const priceInput = useFormattedInput({
        onChange: (value) =>
            setFormValues((current) => ({ ...current, price: value })),
        value: formValues.price,
        valueType: Money,
    });

    async function loadPage(signal?: AbortSignal) {
        if (!productId) return;

        setIsLoading(true);
        try {
            const [nextProduct] = await Promise.all([
                admin
                    ? productApi.getAdmin(productId, signal)
                    : productApi.get(productId, signal),
                admin ? audit.loadEvents(signal).then(() => null) : null,
            ]);
            if (!signal?.aborted) {
                setProduct(nextProduct);
                setSelectedMediaIndex(0);
                setPageError(null);
            }
        } catch (error) {
            if (!signal?.aborted) {
                setPageError(toErrorMessage(error, 'Unable to load product'));
            }
        } finally {
            if (!signal?.aborted) setIsLoading(false);
        }
    }

    useEffect(() => {
        const abortController = new AbortController();
        void loadPage(abortController.signal);
        return () => abortController.abort();
    }, [admin, productId]);

    if (isLoading) {
        return (
            <section className="grid gap-8">
                <div className="bg-ui-100 h-4 w-32 animate-pulse rounded" />
                <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
                    <div className="bg-ui-100 aspect-4/3 animate-pulse rounded border" />
                    <div className="grid content-start gap-4">
                        <div className="grid gap-2">
                            <div className="bg-ui-100 h-3 w-20 animate-pulse rounded" />
                            <div className="bg-ui-100 h-8 w-3/4 animate-pulse rounded" />
                        </div>
                        <div className="bg-ui-100 h-7 w-24 animate-pulse rounded" />
                        <div className="grid gap-2">
                            <div className="bg-ui-100 h-5 w-28 animate-pulse rounded" />
                            <div className="space-y-2">
                                <div className="bg-ui-100 h-4 w-full animate-pulse rounded" />
                                <div className="bg-ui-100 h-4 w-full animate-pulse rounded" />
                                <div className="bg-ui-100 h-4 w-2/3 animate-pulse rounded" />
                            </div>
                        </div>
                    </div>
                </section>
            </section>
        );
    }

    if (!product) {
        return (
            <p className="text-sm text-red-700">
                {pageError ?? 'Product not found'}
            </p>
        );
    }

    const media =
        product.mediaUrls.length > 0
            ? product.mediaUrls
            : ['/iotbay_icon_themed.svg'];
    const inCart = isInCart(product.id);

    function openEditDialog() {
        if (!product) return;
        setFormValues(toProductFormValues(product));
        setFieldErrors({});
        setIsEditOpen(true);
    }

    function closeEditDialog() {
        setFieldErrors({});
        setIsEditOpen(false);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!admin || !product) return;

        const assessment = assessProductForm(formValues);
        setFieldErrors(assessment.fieldErrors);

        if (!assessment.payload) return;

        setIsSubmitting(true);
        try {
            const updatedProduct = await productApi.update(
                product.id,
                assessment.payload
            );
            setProduct(updatedProduct);
            closeEditDialog();
            void audit.loadEvents();
        } catch (error) {
            const nextState = toProductErrorState(error);
            setFieldErrors(nextState.fieldErrors);
            if (nextState.formError) showToast(nextState.formError);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="grid gap-8">
            {pageError && <p className="text-sm text-red-700">{pageError}</p>}

            <section className="grid gap-4">
                <div>
                    <Button
                        className="gap-2 focus-visible:ring-0"
                        onClick={() =>
                            navigate(admin ? '/admin/products' : '/products')
                        }
                        type="button"
                        variant="link"
                    >
                        <FaArrowLeft aria-hidden="true" className="size-3" />
                        Back to {admin ? 'products' : 'catalogue'}
                    </Button>
                </div>

                <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
                    <MediaCarousel
                        media={media}
                        productName={product.name}
                        selectedIndex={selectedMediaIndex}
                        onSelect={setSelectedMediaIndex}
                    />

                    <div className="grid content-start gap-5">
                        <div className="grid gap-1.5">
                            <p className="text-ui-500 font-mono text-sm">
                                {product.code}
                            </p>
                            <div className="flex min-w-0 items-center gap-2">
                                <h1 className="text-ui-900 truncate text-3xl font-semibold tracking-tight">
                                    {product.name}
                                </h1>
                                {admin && (
                                    <Button
                                        aria-label="Edit product"
                                        className="inline-flex size-8 shrink-0 rounded-full p-0"
                                        onClick={openEditDialog}
                                        type="button"
                                        variant="ghost"
                                    >
                                        <FaPenToSquare
                                            aria-hidden="true"
                                            className="size-3.5"
                                        />
                                    </Button>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-ui-900 text-2xl font-semibold">
                                    {Money.format(product.priceCents)}
                                </p>
                                {!admin &&
                                    (inCart ? (
                                        <Button
                                            className="gap-2"
                                            onClick={() =>
                                                removeFromCart(product.id)
                                            }
                                            type="button"
                                            variant="secondary"
                                        >
                                            <FaCheck
                                                aria-hidden="true"
                                                className="size-3"
                                            />
                                            Remove from cart
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() =>
                                                addToCart({
                                                    code: product.code,
                                                    imageUrl: media[0],
                                                    name: product.name,
                                                    priceCents:
                                                        product.priceCents,
                                                    productId: product.id,
                                                })
                                            }
                                            type="button"
                                        >
                                            Add to cart
                                        </Button>
                                    ))}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <h2 className="text-ui-900 text-xl font-semibold">
                                Description
                            </h2>
                            <p className="text-ui-600 text-base leading-7">
                                {product.description ||
                                    'Technical details are being prepared.'}
                            </p>
                        </div>
                    </div>
                </section>
            </section>

            {admin && <AuditTimeline events={audit.events} />}

            <ProductFormDialog
                codeInput={codeInput}
                fieldErrors={fieldErrors}
                formTitle="Edit product"
                isOpen={isEditOpen}
                isSubmitting={isSubmitting}
                nameInput={nameInput}
                onClose={closeEditDialog}
                onMediaUrlsChange={(mediaUrls) => {
                    setFormValues((current) => ({
                        ...current,
                        mediaUrls,
                    }));
                }}
                onSubmit={handleSubmit}
                priceInput={priceInput}
                submitLabel="Save product"
                values={formValues}
            />
        </section>
    );
}

function MediaCarousel({
    media,
    onSelect,
    productName,
    selectedIndex,
}: {
    media: string[];
    onSelect: (index: number) => void;
    productName: string;
    selectedIndex: number;
}) {
    const carouselRef = useRef<HTMLDivElement>(null);
    const autoResumeAtRef = useRef(0);
    const isHoveringRef = useRef(false);
    const selectedIndexRef = useRef(selectedIndex);

    useEffect(() => {
        selectedIndexRef.current = selectedIndex;
    }, [selectedIndex]);

    useEffect(() => {
        if (media.length <= 1) return;

        const container = carouselRef.current;
        const handleEnter = () => {
            isHoveringRef.current = true;
        };
        const handleLeave = () => {
            isHoveringRef.current = false;
            autoResumeAtRef.current = Date.now() + 4000;
        };
        const handlePointerDown = () => {
            autoResumeAtRef.current = Date.now() + 8000;
        };
        container?.addEventListener('mouseenter', handleEnter);
        container?.addEventListener('mouseleave', handleLeave);
        container?.addEventListener('pointerdown', handlePointerDown);

        const timer = setInterval(() => {
            if (
                !isHoveringRef.current &&
                Date.now() >= autoResumeAtRef.current
            ) {
                onSelect((selectedIndexRef.current + 1) % media.length);
            }
        }, 4000);

        return () => {
            clearInterval(timer);
            container?.removeEventListener('mouseenter', handleEnter);
            container?.removeEventListener('mouseleave', handleLeave);
            container?.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [media.length, onSelect]);

    useEffect(() => {
        const container = carouselRef.current;
        if (!container) return;
        container.scrollTo({
            left: selectedIndex * container.offsetWidth,
            behavior: 'smooth',
        });
    }, [selectedIndex]);

    if (media.length === 1) {
        return (
            <div className="bg-ui-100 border-ui-200 aspect-4/3 overflow-hidden rounded border">
                <img
                    alt={productName}
                    className="h-full w-full object-cover"
                    src={media[0]}
                />
            </div>
        );
    }

    return (
        <div className="grid gap-3">
            <div className="border-ui-200 relative overflow-hidden rounded border">
                <div
                    ref={carouselRef}
                    className="bg-ui-100 flex aspect-4/3 snap-x snap-mandatory overflow-x-hidden"
                >
                    {media.map((url) => (
                        <div key={url} className="w-full shrink-0 snap-start">
                            <img
                                alt={productName}
                                className="h-full w-full object-cover"
                                src={url}
                            />
                        </div>
                    ))}
                </div>

                <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
                    <IconButton
                        aria-label="Previous image"
                        highContrast
                        onClick={() => {
                            autoResumeAtRef.current = Date.now() + 8000;
                            onSelect(
                                selectedIndex === 0
                                    ? media.length - 1
                                    : selectedIndex - 1
                            );
                        }}
                        size="md"
                        type="button"
                        variant="overlay"
                    >
                        <FaChevronLeft
                            aria-hidden="true"
                            className="size-3.5"
                        />
                    </IconButton>
                    <IconButton
                        aria-label="Next image"
                        highContrast
                        onClick={() => {
                            autoResumeAtRef.current = Date.now() + 8000;
                            onSelect((selectedIndex + 1) % media.length);
                        }}
                        size="md"
                        type="button"
                        variant="overlay"
                    >
                        <FaChevronRight
                            aria-hidden="true"
                            className="size-3.5"
                        />
                    </IconButton>
                </div>
            </div>

            <div className="-mx-1.5 -my-1 flex gap-2 overflow-x-auto px-1.5 py-1">
                {media.map((url, index) => (
                    <button
                        key={url}
                        aria-current={
                            index === selectedIndex ? 'true' : undefined
                        }
                        aria-label={`Show image ${index + 1}`}
                        className={`focus-visible:ring-ui-900 focus-visible:ring-offset-ui-0 h-16 w-20 shrink-0 overflow-hidden rounded border transition-[border-color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                            index === selectedIndex
                                ? 'border-ui-900'
                                : 'border-ui-200 hover:border-ui-400'
                        }`}
                        onClick={() => {
                            autoResumeAtRef.current = Date.now() + 8000;
                            onSelect(index);
                        }}
                        type="button"
                    >
                        <img
                            alt=""
                            className="h-full w-full object-cover"
                            src={url}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}
