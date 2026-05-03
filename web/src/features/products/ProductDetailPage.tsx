import { useEffect, useState, type FormEvent } from 'react';
import {
    FaArrowLeft,
    FaChevronLeft,
    FaChevronRight,
    FaPenToSquare,
} from 'react-icons/fa6';
import { useNavigate, useParams } from 'react-router-dom';

import { AuditTimeline } from '@features/audit/components/AuditTimeline';
import { useEntityAudit } from '@features/audit/useEntityAudit';
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
                audit.loadEvents(signal).then(() => null),
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
        return <p className="text-ui-500 text-sm">Loading product...</p>;
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
    const selectedMedia = media[Math.min(selectedMediaIndex, media.length - 1)];

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
        <section className="mx-auto grid max-w-6xl gap-8">
            {pageError && <p className="text-sm text-red-700">{pageError}</p>}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                    className="text-ui-600 hover:text-ui-900 h-auto gap-2 px-0 hover:bg-transparent"
                    onClick={() =>
                        navigate(admin ? '/admin/products' : '/products')
                    }
                    type="button"
                    variant="ghost"
                >
                    <FaArrowLeft aria-hidden="true" className="size-3" />
                    Back to {admin ? 'products' : 'catalogue'}
                </Button>
            </div>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
                <div className="grid gap-3">
                    <div className="bg-ui-100 border-ui-200 relative flex aspect-4/3 items-center justify-center overflow-hidden rounded border">
                        <img
                            alt={product.name}
                            className="h-full w-full object-cover"
                            src={selectedMedia}
                        />

                        {media.length > 1 && (
                            <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 justify-between">
                                <button
                                    aria-label="Previous image"
                                    className="bg-ui-0/90 text-ui-700 hover:bg-ui-0 border-ui-200 inline-flex size-9 items-center justify-center rounded-full border shadow-sm"
                                    onClick={() => {
                                        setSelectedMediaIndex((current) =>
                                            current === 0
                                                ? media.length - 1
                                                : current - 1
                                        );
                                    }}
                                    type="button"
                                >
                                    <FaChevronLeft
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                </button>
                                <button
                                    aria-label="Next image"
                                    className="bg-ui-0/90 text-ui-700 hover:bg-ui-0 border-ui-200 inline-flex size-9 items-center justify-center rounded-full border shadow-sm"
                                    onClick={() => {
                                        setSelectedMediaIndex((current) =>
                                            current === media.length - 1
                                                ? 0
                                                : current + 1
                                        );
                                    }}
                                    type="button"
                                >
                                    <FaChevronRight
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                </button>
                            </div>
                        )}
                    </div>

                    {media.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto">
                            {media.map((mediaUrl, index) => (
                                <button
                                    aria-label={`Show image ${index + 1}`}
                                    className={`focus-visible:ring-ui-400 h-16 w-20 shrink-0 overflow-hidden rounded border focus:outline-none focus-visible:ring-2 ${
                                        index === selectedMediaIndex
                                            ? 'border-ui-900'
                                            : 'border-ui-200'
                                    }`}
                                    aria-current={
                                        index === selectedMediaIndex
                                            ? 'true'
                                            : undefined
                                    }
                                    key={mediaUrl}
                                    onClick={() => {
                                        setSelectedMediaIndex(index);
                                    }}
                                    type="button"
                                >
                                    <img
                                        alt=""
                                        className="h-full w-full object-cover"
                                        src={mediaUrl}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid content-start gap-4">
                    <div className="grid gap-2">
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
                        <p className="text-ui-500 text-sm">
                            Catalogue code {product.code}
                        </p>
                    </div>
                    <p className="text-ui-900 text-2xl font-semibold">
                        {Money.format(product.priceCents)}
                    </p>
                </div>
            </section>

            <section className="grid gap-2">
                <h2 className="text-ui-900 text-xl font-semibold">
                    Description
                </h2>
                <p className="text-ui-600 max-w-3xl leading-7">
                    {product.description ||
                        'Technical details are being prepared.'}
                </p>
            </section>

            <AuditTimeline events={audit.events} />

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
