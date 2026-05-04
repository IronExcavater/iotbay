import { useEffect, useState, type ReactNode } from 'react';
import { FaGrip, FaList, FaMagnifyingGlass } from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';

import { productApi, type Product } from '@features/products/api';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { toErrorMessage } from '@shared/services/http';
import { SearchInput } from '@shared/ui/form/SearchInput';
import { PageHeader } from '@shared/ui/PageHeader';
import {
    Table,
    TableHead,
    TableLoadingRow,
    TableMessageRow,
    TablePrimaryActionRow,
} from '@shared/ui/table/Table';
import { Tooltip } from '@shared/ui/Tooltip';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';
import { Money } from '@shared/value-objects/Money';

type CatalogueView = 'cards' | 'list';

export default function ProductCatalogPage() {
    const navigate = useNavigate();
    useDocumentTitle('Catalogue');
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [view, setView] = useState<CatalogueView>('cards');

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

    const filteredProducts = products.filter((product) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return [product.name, product.code, product.description]
            .join(' ')
            .toLowerCase()
            .includes(query);
    });

    return (
        <section className="grid gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <PageHeader
                    description="Find devices for monitoring, automation, security, and connected living."
                    title="Catalogue"
                />

                <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
                    <SearchInput
                        className="w-full sm:w-72"
                        onChange={setSearch}
                        placeholder="Search catalogue"
                        value={search}
                    />
                    <div
                        aria-label="Catalogue view"
                        className="ring-ui-300 flex h-10 rounded ring-1"
                        role="group"
                    >
                        <ViewButton
                            active={view === 'cards'}
                            label="Card view"
                            onClick={() => setView('cards')}
                        >
                            <FaGrip aria-hidden="true" className="size-3.5" />
                        </ViewButton>
                        <ViewButton
                            active={view === 'list'}
                            label="List view"
                            onClick={() => setView('list')}
                        >
                            <FaList aria-hidden="true" className="size-3.5" />
                        </ViewButton>
                    </div>
                </div>
            </div>

            {isLoadingProducts ? (
                view === 'cards' ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <ProductCardSkeleton />
                        <ProductCardSkeleton />
                        <ProductCardSkeleton />
                    </div>
                ) : (
                    <ProductList
                        error={null}
                        isLoading
                        onNavigate={navigate}
                        products={[]}
                    />
                )
            ) : productsError ? (
                <p className="text-sm text-red-700">{productsError}</p>
            ) : filteredProducts.length === 0 ? (
                <section className="grid justify-items-center gap-3 py-12 text-center">
                    <FaMagnifyingGlass
                        aria-hidden="true"
                        className="text-ui-300 size-8"
                    />
                    <p className="text-ui-500 text-sm">
                        No products matched your search.
                    </p>
                </section>
            ) : view === 'cards' ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <ProductList
                    error={null}
                    isLoading={false}
                    onNavigate={navigate}
                    products={filteredProducts}
                />
            )}
        </section>
    );
}

function ViewButton({
    active,
    children,
    label,
    onClick,
}: {
    active: boolean;
    children: ReactNode;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            aria-label={label}
            className={`focus-visible:ring-ui-900 inline-flex w-10 items-center justify-center transition-[background-color,color] outline-none first:rounded-l last:rounded-r focus-visible:ring-2 focus-visible:ring-inset ${
                active
                    ? 'bg-ui-950 text-ui-0'
                    : 'text-ui-500 hover:bg-ui-100 hover:text-ui-900'
            }`}
            onClick={onClick}
            type="button"
        >
            {children}
        </button>
    );
}

function ProductCard({ product }: { product: Product }) {
    const image = product.mediaUrls[0] ?? '/iotbay_icon_themed.svg';

    return (
        <Link
            className="group border-ui-200 bg-ui-0 hover:border-ui-300 hover:bg-ui-50 focus-visible:ring-ui-900 focus-visible:ring-offset-ui-0 grid overflow-hidden rounded border transition-[background-color,border-color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            to={`/products/${product.id}`}
        >
            <div className="bg-ui-100 aspect-4/3 overflow-hidden">
                <img
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                    src={image}
                />
            </div>
            <div className="grid gap-2 p-4">
                <span className="text-ui-500 font-mono text-xs">
                    {product.code}
                </span>
                <h2 className="text-ui-900 font-semibold">{product.name}</h2>
                <p className="text-ui-900 text-lg font-semibold">
                    {Money.format(product.priceCents)}
                </p>
            </div>
        </Link>
    );
}

function ProductCardSkeleton() {
    return (
        <div className="border-ui-200 bg-ui-0 grid overflow-hidden rounded border">
            <div className="bg-ui-100 aspect-4/3 animate-pulse" />
            <div className="grid gap-3 p-4">
                <div className="bg-ui-100 h-3 w-20 animate-pulse rounded-full" />
                <div className="bg-ui-200 h-4 w-44 max-w-full animate-pulse rounded-full" />
                <div className="bg-ui-100 h-4 w-24 animate-pulse rounded-full" />
            </div>
        </div>
    );
}

function ProductList({
    error,
    isLoading,
    onNavigate,
    products,
}: {
    error: string | null;
    isLoading: boolean;
    onNavigate: (to: string) => void;
    products: Product[];
}) {
    return (
        <div className="bg-ui-0 border-ui-200 overflow-hidden rounded border">
            <div className="overflow-x-auto">
                <Table>
                    <colgroup>
                        <col className="w-[18%]" />
                        <col className="w-[42%]" />
                        <col className="w-[18%]" />
                        <col className="w-[22%]" />
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
                        {isLoading ? (
                            <>
                                <TableLoadingRow colSpan={4} />
                                <TableLoadingRow colSpan={4} />
                                <TableLoadingRow colSpan={4} />
                            </>
                        ) : error ? (
                            <TableMessageRow
                                colSpan={4}
                                message={error}
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
                                <TablePrimaryActionRow
                                    key={product.id}
                                    label={`View ${product.name}`}
                                    onAction={() => {
                                        onNavigate(`/products/${product.id}`);
                                    }}
                                >
                                    <td className="text-ui-600 px-5 py-3 font-mono text-xs">
                                        {product.code}
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-ui-900 font-medium">
                                            {product.name}
                                        </span>
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
                                </TablePrimaryActionRow>
                            ))
                        )}
                    </tbody>
                </Table>
            </div>
        </div>
    );
}
