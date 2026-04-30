import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { AuditTimeline } from '@features/audit/components/AuditTimeline';
import { useEntityAudit } from '@features/audit/useEntityAudit';
import { productApi, type Product } from '@features/products/api';
import { toErrorMessage } from '@shared/services/http';
import { useToast } from '@shared/ui/toast/ToastProvider';
import { Money } from '@shared/value-objects/Money';

export default function ProductDetailPage({
    admin = false,
}: {
    admin?: boolean;
}) {
    const { productId = '' } = useParams();
    const { showToast } = useToast();
    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);
    const audit = useEntityAudit({
        entityId: productId,
        entityType: 'product',
        onAfterReplay: () => loadPage(),
        showToast,
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

    return (
        <section className="mx-auto grid max-w-6xl gap-8">
            {pageError && <p className="text-sm text-red-700">{pageError}</p>}

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
                <div className="bg-ui-100 border-ui-200 flex aspect-4/3 items-center justify-center overflow-hidden rounded border">
                    <img
                        alt=""
                        className="h-full w-full object-contain p-10"
                        src={media[0]}
                    />
                </div>

                <div className="grid content-start gap-4">
                    <div className="grid gap-2">
                        <p className="text-ui-500 font-mono text-sm">
                            {product.code}
                        </p>
                        <h1 className="text-ui-900 text-4xl font-semibold tracking-tight">
                            {product.name}
                        </h1>
                        <p className="text-ui-500 text-sm">
                            IoTBay device catalogue item
                        </p>
                    </div>
                    <p className="text-ui-900 text-3xl font-semibold">
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
                        'No detailed description has been added for this product yet.'}
                </p>
            </section>

            <AuditTimeline
                canReplay={admin}
                events={audit.events}
                onRedo={(event) => {
                    void audit.replay(event, 'redo');
                }}
                onUndo={(event) => {
                    void audit.replay(event, 'undo');
                }}
                pendingEventId={audit.pendingEventId}
            />
        </section>
    );
}
