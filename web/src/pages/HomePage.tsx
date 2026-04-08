import { useEffect, useState } from 'react';

import { PageHeader } from '../components/PageHeader';
import { formatDateTime } from '../formatting/dateTime';
import { formatAud } from '../formatting/money';
import { productApi, type Product } from '../products/api';
import { toErrorMessage } from '../services/http';

export default function HomePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState<string | null>(null);

    useEffect(() => {
        const abortController = new AbortController();

        async function loadProducts() {
            try {
                const items = await productApi.list(abortController.signal);

                if (abortController.signal.aborted)
                    return;

                setProducts(items);
                setProductsError(null);
            } catch (error) {
                if (abortController.signal.aborted)
                    return;

                setProductsError(toErrorMessage(error, 'Unable to load products'));
            } finally {
                if (!abortController.signal.aborted)
                    setIsLoadingProducts(false);
            }
        }

        void loadProducts();

        return () => abortController.abort();
    }, []);

    return (
        <section className="grid gap-6">
            <PageHeader title="Products" />

            <div className="overflow-hidden rounded border border-slate-200 bg-white">
                {isLoadingProducts ? (
                    <p className="px-5 py-4 text-slate-500">Loading products</p>
                ) : productsError ? (
                    <p className="px-5 py-4 text-red-700">{productsError}</p>
                ) : products.length === 0 ? (
                    <p className="px-5 py-4 text-slate-500">No products yet</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-100 text-xs font-semibold tracking-[0.12em] text-slate-700 uppercase">
                                <tr>
                                    <th className="px-5 py-3">Code</th>
                                    <th className="px-5 py-3">Name</th>
                                    <th className="px-5 py-3">Price</th>
                                    <th className="px-5 py-3">Updated</th>
                                </tr>
                            </thead>

                            <tbody>
                                {products.map((product) => (
                                    <tr
                                        className="border-t border-slate-200 align-top"
                                        key={product.id}
                                    >
                                        <td className="px-5 py-3 font-mono text-xs text-slate-600">
                                            {product.code}
                                        </td>
                                        <td className="px-5 py-3">
                                            {product.name}
                                        </td>
                                        <td className="px-5 py-3">
                                            {formatAud(product.priceCents)}
                                        </td>
                                        <td
                                            className="px-5 py-3 text-slate-500"
                                            title={formatDateTime(
                                                product.updatedAt,
                                                'long'
                                            )}
                                        >
                                            {formatDateTime(
                                                product.updatedAt,
                                                'short'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
