import type { ReactNode } from 'react';

import type { Product } from '@features/products/api';

export function ProductTagRow({
    admin = false,
    product,
}: {
    admin?: boolean;
    product: Product;
}) {
    return (
        <span className="inline-flex w-fit flex-wrap items-center gap-1.5 align-middle">
            {product.type && <ProductTag>{product.type}</ProductTag>}
            {admin && <ProductTag>Stock: {product.stock}</ProductTag>}
        </span>
    );
}

export function ProductTag({ children }: { children: ReactNode }) {
    return (
        <span className="bg-ui-100 text-ui-700 inline-flex rounded-full px-2.5 py-1 text-xs font-medium">
            {children}
        </span>
    );
}

export function StockStatus({ product }: { product: Product }) {
    if (!product.stockStatusMessage || !product.stockStatusTone) return null;

    const styles =
        product.stockStatusTone === 'warning'
            ? 'bg-amber-50 text-amber-700 ring-amber-200'
            : 'bg-red-50 text-red-700 ring-red-200';

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${styles}`}
        >
            {product.stockStatusMessage}
        </span>
    );
}
