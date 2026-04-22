import { useEffect, useState } from 'react';

import { PageHeader } from '../components/PageHeader';
import {
    Table,
    TableHead,
    TableLoadingRow,
    TableMessageRow,
} from '../components/table/Table';
import { Tooltip } from '../components/ui/Tooltip';
import { productApi, type Product } from '../products/api';
import { toErrorMessage } from '../services/http';
import { DateTimeValue } from '../types/DateTimeValue';
import { Money } from '../types/Money';

export default function HomePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState<string | null>(null);

    useEffect(() => {
        const abortController = new AbortController();

        async function loadProducts() {
            try {
                const items = await productApi.list(abortController.signal);

                if (abortController.signal.aborted) return;

                setProducts(items);
                setProductsError(null);
            } catch (error) {
                if (abortController.signal.aborted) return;

                setProductsError(
                    toErrorMessage(error, 'Unable to load products')
                );
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

            <div className="bg-ui-0 border-ui-200 overflow-hidden rounded border">
                <div className="overflow-x-auto">
                    <Table>
                        <colgroup>
                            <col className="w-[18%]" />
                            <col className="w-[38%]" />
                            <col className="w-[18%]" />
                            <col className="w-[26%]" />
                        </colgroup>
                        <TableHead>
                            <tr>
                                <th className="px-5 py-3">Code</th>
                                <th className="px-5 py-3">Name</th>
                                <th className="px-5 py-3">Price</th>
                                <th className="px-5 py-3">Updated</th>
                            </tr>
                        </TableHead>

                        <tbody>
                            {isLoadingProducts ? (
                                <>
                                    <TableLoadingRow colSpan={4} />
                                    <TableLoadingRow colSpan={4} />
                                    <TableLoadingRow colSpan={4} />
                                </>
                            ) : productsError ? (
                                <TableMessageRow
                                    colSpan={4}
                                    message={productsError}
                                    tone="error"
                                />
                            ) : products.length === 0 ? (
                                <TableMessageRow
                                    colSpan={4}
                                    message="No products yet"
                                    tone="muted"
                                />
                            ) : (
                                products.map((product) => (
                                    <tr
                                        className="border-ui-200 border-t align-top"
                                        key={product.id}
                                    >
                                        <td className="text-ui-600 px-5 py-3 font-mono text-xs">
                                            {product.code}
                                        </td>
                                        <td className="px-5 py-3">
                                            {product.name}
                                        </td>
                                        <td className="px-5 py-3">
                                            {Money.format(product.priceCents)}
                                        </td>
                                        <td className="text-ui-500 px-5 py-3">
                                            <Tooltip
                                                label={DateTimeValue.format(
                                                    product.updatedAt,
                                                    'long'
                                                )}
                                            >
                                                <span>
                                                    {DateTimeValue.format(
                                                        product.updatedAt,
                                                        'short'
                                                    )}
                                                </span>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            </div>
        </section>
    );
}
