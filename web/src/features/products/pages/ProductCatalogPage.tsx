import { useEffect, useRef, useState } from 'react';
import {
    FaChevronRight,
    FaGrip,
    FaList,
    FaMagnifyingGlass,
} from 'react-icons/fa6';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { AddToCartControl } from '@features/cart/components/AddToCartControl';
import {
    productApi,
    type Product,
    type ProductTypeCount,
} from '@features/products/api';
import {
    ProductTagRow,
    StockStatus,
} from '@features/products/components/ProductBadges';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { toErrorMessage } from '@shared/services/http';
import { SearchInput } from '@shared/ui/form/SearchInput';
import { PageHeader } from '@shared/ui/PageHeader';
import { Pagination } from '@shared/ui/Pagination';
import { Money } from '@shared/value-objects/Money';

type CatalogueView = 'cards' | 'list';

// ── Type tree ─────────────────────────────────────────────────────────────────

interface TypeTreeNode {
    children: TypeTreeNode[];
    count: number;
    label: string;
    path: string;
}

function buildTypeTree(types: ProductTypeCount[]): TypeTreeNode[] {
    const nodeMap = new Map<string, TypeTreeNode>();
    const root: TypeTreeNode[] = [];

    const sorted = [...types].sort((a, b) => a.type.localeCompare(b.type));

    for (const { count, type } of sorted) {
        const parts = type.split('/');

        for (let i = 0; i < parts.length; i++) {
            const path = parts.slice(0, i + 1).join('/');

            if (!nodeMap.has(path)) {
                const node: TypeTreeNode = {
                    children: [],
                    count: 0,
                    label: parts[i],
                    path,
                };
                nodeMap.set(path, node);

                if (i === 0) {
                    root.push(node);
                } else {
                    const parentPath = parts.slice(0, i).join('/');
                    nodeMap.get(parentPath)!.children.push(node);
                }
            }

            if (i === parts.length - 1) {
                nodeMap.get(path)!.count += count;
            }
        }
    }

    function bubbleCount(node: TypeTreeNode): number {
        if (node.children.length === 0) return node.count;
        const childTotal = node.children.reduce(
            (sum, c) => sum + bubbleCount(c),
            0
        );
        node.count += childTotal;
        return node.count;
    }
    root.forEach(bubbleCount);

    return root;
}

// ── Sidebar components ─────────────────────────────────────────────────────────

const DEPTH_PADDING = ['pl-2', 'pl-5', 'pl-8', 'pl-11'] as const;

function TypeTreeNode({
    depth,
    node,
    onSelect,
    selected,
}: {
    depth: number;
    node: TypeTreeNode;
    onSelect: (path: string) => void;
    selected: string;
}) {
    const isSelected = selected === node.path;
    const isAncestor = selected.startsWith(`${node.path}/`) && !isSelected;
    const [expanded, setExpanded] = useState(isSelected || isAncestor);
    const hasChildren = node.children.length > 0;

    return (
        <li>
            <button
                className={`focus-visible:ring-ui-900 flex w-full items-center gap-1.5 rounded py-1.5 pr-2 text-sm transition-colors outline-none focus-visible:ring-2 ${DEPTH_PADDING[Math.min(depth, DEPTH_PADDING.length - 1)]} ${
                    isSelected
                        ? 'bg-ui-950 text-ui-0'
                        : 'text-ui-700 hover:bg-ui-100 hover:text-ui-900'
                }`}
                onClick={() => {
                    if (hasChildren) setExpanded((e) => !e);
                    onSelect(isSelected ? '' : node.path);
                }}
                type="button"
            >
                {hasChildren && (
                    <FaChevronRight
                        aria-hidden="true"
                        className={`size-2.5 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''} ${isSelected ? 'text-ui-0/60' : 'text-ui-400'}`}
                    />
                )}
                <span className="flex-1 truncate text-left">{node.label}</span>
                <span
                    className={`shrink-0 text-xs tabular-nums ${isSelected ? 'text-ui-0/60' : 'text-ui-400'}`}
                >
                    {node.count}
                </span>
            </button>
            {hasChildren && expanded && (
                <ul className="mt-0.5 grid gap-0.5">
                    {node.children.map((child) => (
                        <TypeTreeNode
                            key={child.path}
                            depth={depth + 1}
                            node={child}
                            onSelect={onSelect}
                            selected={selected}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

function TypeBreadcrumb({
    onSelect,
    type,
}: {
    onSelect: (path: string) => void;
    type: string;
}) {
    const parts = type.split('/');

    return (
        <nav
            aria-label="Category filter"
            className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm"
        >
            <button
                className="text-ui-500 hover:text-ui-900 transition-colors"
                onClick={() => onSelect('')}
                type="button"
            >
                All
            </button>
            {parts.map((part, i) => {
                const path = parts.slice(0, i + 1).join('/');
                const isLast = i === parts.length - 1;

                return (
                    <span key={path} className="flex items-center gap-x-1">
                        <FaChevronRight
                            aria-hidden="true"
                            className="text-ui-300 size-2.5"
                        />
                        {isLast ? (
                            <span className="text-ui-900 font-medium">
                                {part}
                            </span>
                        ) : (
                            <button
                                className="text-ui-500 hover:text-ui-900 transition-colors"
                                onClick={() => onSelect(path)}
                                type="button"
                            >
                                {part}
                            </button>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}

// ── Hover overlay ──────────────────────────────────────────────────────────────

function ProductOverlay({ product }: { product: Product }) {
    const media = product.mediaUrls;

    if (!product.description && media.length <= 1) return null;

    return (
        <div className="pointer-events-none absolute top-[calc(100%-1px)] right-0 left-0 z-20 translate-y-1 opacity-0 transition-[opacity,transform] duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
            <div className="border-ui-200 group-hover:border-ui-300 bg-ui-0 overflow-hidden rounded-b-lg border border-t-0 shadow-[0_6px_20px_rgba(0,0,0,0.10)]">
                <div className="grid gap-2.5 p-3">
                    {media.length > 1 && (
                        <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 py-0.5">
                            {media.map((url) => (
                                <div
                                    key={url}
                                    className="border-ui-200 size-11 shrink-0 overflow-hidden rounded border"
                                >
                                    <img
                                        alt=""
                                        className="h-full w-full object-cover"
                                        src={url}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                    {product.description && (
                        <p className="text-ui-600 line-clamp-4 text-xs leading-5">
                            {product.description}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Card ───────────────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
    const image = product.mediaUrls[0] ?? '/iotbay_icon_themed.svg';
    const cartItem = {
        code: product.code,
        imageUrl: image,
        name: product.name,
        priceCents: product.priceCents,
        productId: product.id,
    };

    return (
        <article className="group relative z-0 hover:z-10">
            <div className="border-ui-200 bg-ui-0 group-hover:border-ui-300 grid overflow-hidden rounded border transition-[border-color,box-shadow] group-hover:shadow-md">
                <Link
                    className="focus-visible:ring-ui-900 focus-visible:ring-offset-ui-0 block overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    to={`/products/${product.id}`}
                >
                    <div className="bg-ui-100 aspect-4/3 overflow-hidden">
                        <img
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            src={image}
                        />
                    </div>
                </Link>

                <div className="grid content-start gap-2 p-4">
                    <h2 className="text-ui-900 leading-snug font-semibold">
                        <Link
                            className="underline-offset-4 outline-none hover:underline focus-visible:underline"
                            to={`/products/${product.id}`}
                        >
                            {product.name}
                        </Link>
                    </h2>

                    <div className="flex items-center justify-between gap-2">
                        <p className="text-ui-900 text-lg leading-none font-semibold">
                            {Money.format(product.priceCents)}
                        </p>
                        <AddToCartControl
                            item={cartItem}
                            stock={product.stock}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        <ProductTagRow product={product} />
                        <StockStatus product={product} />
                    </div>
                </div>
            </div>

            <ProductOverlay product={product} />
        </article>
    );
}

function ProductCardSkeleton() {
    return (
        <div className="border-ui-200 bg-ui-0 grid overflow-hidden rounded border">
            <div className="bg-ui-100 aspect-4/3 animate-pulse" />
            <div className="grid gap-3 p-4">
                <div className="bg-ui-200 h-4 w-44 max-w-full animate-pulse rounded-full" />
                <div className="flex items-center justify-between">
                    <div className="bg-ui-100 h-5 w-20 animate-pulse rounded-full" />
                    <div className="bg-ui-100 h-9 w-16 animate-pulse rounded" />
                </div>
                <div className="bg-ui-100 h-3 w-24 animate-pulse rounded-full" />
            </div>
        </div>
    );
}

// ── List row ───────────────────────────────────────────────────────────────────

function ProductListRow({
    onNavigate,
    product,
}: {
    onNavigate: (to: string) => void;
    product: Product;
}) {
    const image = product.mediaUrls[0] ?? '/iotbay_icon_themed.svg';
    const cartItem = {
        code: product.code,
        imageUrl: image,
        name: product.name,
        priceCents: product.priceCents,
        productId: product.id,
    };

    return (
        <article className="group hover:bg-ui-50 relative z-0 grid grid-cols-[5rem_minmax(0,1fr)_auto] items-stretch transition-colors hover:z-10">
            <button
                aria-label={`View ${product.name}`}
                className="focus-visible:ring-ui-900 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset"
                onClick={() => onNavigate(`/products/${product.id}`)}
                type="button"
            >
                <img
                    alt=""
                    className="h-full w-full object-cover"
                    src={image}
                />
            </button>

            <div className="grid min-w-0 content-start gap-1 px-4 py-3.5">
                <Link
                    className="text-ui-900 w-fit font-medium underline-offset-4 outline-none hover:underline focus-visible:underline"
                    to={`/products/${product.id}`}
                >
                    {product.name}
                </Link>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-ui-900 font-semibold">
                        {Money.format(product.priceCents)}
                    </span>
                    <ProductTagRow product={product} />
                    <StockStatus product={product} />
                </div>

                {product.description && (
                    <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 group-hover:grid-rows-[1fr]">
                        <p className="text-ui-500 mt-1 line-clamp-2 overflow-hidden text-xs leading-5">
                            {product.description}
                        </p>
                    </div>
                )}
            </div>

            <div
                className="flex items-start justify-end px-4 py-3.5"
                onClick={(event) => event.stopPropagation()}
            >
                <AddToCartControl item={cartItem} stock={product.stock} />
            </div>

            {/* Row overlay with all media */}
            {product.mediaUrls.length > 1 && (
                <div className="pointer-events-none absolute top-[calc(100%-1px)] right-0 left-0 z-20 translate-y-0.5 opacity-0 transition-[opacity,transform] duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="border-ui-200 bg-ui-0 overflow-hidden border border-t-0 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                        <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-4 py-2.5">
                            {product.mediaUrls.map((url) => (
                                <div
                                    key={url}
                                    className="border-ui-200 size-12 shrink-0 overflow-hidden rounded border"
                                >
                                    <img
                                        alt=""
                                        className="h-full w-full object-cover"
                                        src={url}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
}

function ProductListRowSkeleton() {
    return (
        <div className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center">
            <div className="bg-ui-100 h-16 animate-pulse" />
            <div className="grid gap-2 px-4 py-3.5">
                <div className="bg-ui-200 h-4 w-44 max-w-full animate-pulse rounded-full" />
                <div className="bg-ui-100 h-3 w-24 animate-pulse rounded-full" />
            </div>
            <div className="px-4 py-3.5">
                <div className="bg-ui-100 h-9 w-16 animate-pulse rounded" />
            </div>
        </div>
    );
}

// ── View toggle ────────────────────────────────────────────────────────────────

function ViewToggle({
    onChange,
    view,
}: {
    onChange: (view: CatalogueView) => void;
    view: CatalogueView;
}) {
    return (
        <div
            aria-label="Catalogue view"
            className="ring-ui-300 flex h-10 rounded ring-1"
            role="group"
        >
            {(
                [
                    { icon: FaGrip, label: 'Card view', value: 'cards' },
                    { icon: FaList, label: 'List view', value: 'list' },
                ] as const
            ).map(({ icon: Icon, label, value }) => (
                <button
                    key={value}
                    aria-label={label}
                    className={`focus-visible:ring-ui-900 inline-flex w-10 items-center justify-center transition-[background-color,color] outline-none first:rounded-l last:rounded-r focus-visible:ring-2 focus-visible:ring-inset ${
                        view === value
                            ? 'bg-ui-950 text-ui-0'
                            : 'text-ui-500 hover:bg-ui-100 hover:text-ui-900'
                    }`}
                    onClick={() => onChange(value)}
                    type="button"
                >
                    <Icon aria-hidden="true" className="size-3.5" />
                </button>
            ))}
        </div>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ProductCatalogPage() {
    const navigate = useNavigate();
    useDocumentTitle('Catalogue');

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedType = searchParams.get('type') ?? '';
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 350);
    const [view, setView] = useState<CatalogueView>('cards');

    const [products, setProducts] = useState<Product[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [productsError, setProductsError] = useState<string | null>(null);

    const [types, setTypes] = useState<ProductTypeCount[]>([]);

    // Keep the last completed load's page count so the pagination control
    // doesn't flicker to 0 while a new request is in-flight.
    const stablePages = useRef(totalPages);
    if (!isLoading) stablePages.current = totalPages;

    // Load products whenever filters/page change
    useEffect(() => {
        const ac = new AbortController();
        setIsLoading(true);

        void productApi
            .list(
                {
                    page,
                    search: debouncedSearch.trim() || undefined,
                    type: selectedType || undefined,
                },
                ac.signal
            )
            .then((result) => {
                if (!ac.signal.aborted) {
                    setProducts(result.items);
                    setTotal(result.total);
                    setTotalPages(result.pages);
                    setProductsError(null);
                }
            })
            .catch((err) => {
                if (!ac.signal.aborted) {
                    setProductsError(
                        toErrorMessage(err, 'Unable to load products')
                    );
                }
            })
            .finally(() => {
                if (!ac.signal.aborted) setIsLoading(false);
            });

        return () => ac.abort();
    }, [debouncedSearch, selectedType, page]);

    // Load types sidebar once
    useEffect(() => {
        const ac = new AbortController();
        productApi
            .types(ac.signal)
            .then(setTypes)
            .catch(() => {});
        return () => ac.abort();
    }, []);

    function selectType(type: string) {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (type) next.set('type', type);
            else next.delete('type');
            next.delete('page');
            return next;
        });
    }

    function goToPage(p: number) {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (p > 1) next.set('page', String(p));
            else next.delete('page');
            return next;
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const typeTree = buildTypeTree(types);
    const hasFilters = Boolean(debouncedSearch.trim() || selectedType);

    return (
        <section className="grid gap-6">
            <PageHeader
                description="Find devices for monitoring, automation, security, and connected living."
                title="Catalogue"
            />

            <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
                {/* ── Sidebar ────────────────────────────────────────────── */}
                <aside className="grid gap-5">
                    <SearchInput
                        className="w-full"
                        onChange={setSearch}
                        placeholder="Search catalogue"
                        value={search}
                    />

                    {typeTree.length > 0 && (
                        <div className="bg-ui-0 border-ui-200 overflow-hidden rounded border">
                            <div className="border-ui-200 flex items-center justify-between border-b px-3 py-2.5">
                                <span className="text-ui-700 text-xs font-semibold tracking-[0.08em] uppercase">
                                    Category
                                </span>
                                {selectedType && (
                                    <button
                                        className="text-ui-500 hover:text-ui-900 text-xs transition-colors"
                                        onClick={() => selectType('')}
                                        type="button"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <ul className="grid gap-0.5 p-1.5">
                                {typeTree.map((node) => (
                                    <TypeTreeNode
                                        key={node.path}
                                        depth={0}
                                        node={node}
                                        onSelect={selectType}
                                        selected={selectedType}
                                    />
                                ))}
                            </ul>
                        </div>
                    )}
                </aside>

                {/* ── Main ───────────────────────────────────────────────── */}
                <div className="grid gap-4">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {selectedType && (
                                <TypeBreadcrumb
                                    onSelect={selectType}
                                    type={selectedType}
                                />
                            )}
                            {!isLoading && (
                                <span className="text-ui-500 text-sm">
                                    {total}{' '}
                                    {total === 1 ? 'product' : 'products'}
                                </span>
                            )}
                        </div>
                        <ViewToggle onChange={setView} view={view} />
                    </div>

                    {/* Product grid / list */}
                    {productsError ? (
                        <p className="text-sm text-red-700">{productsError}</p>
                    ) : isLoading && products.length === 0 ? (
                        view === 'cards' ? (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                <ProductCardSkeleton />
                                <ProductCardSkeleton />
                                <ProductCardSkeleton />
                            </div>
                        ) : (
                            <div className="border-ui-200 bg-ui-0 divide-ui-200 divide-y overflow-hidden rounded border">
                                <ProductListRowSkeleton />
                                <ProductListRowSkeleton />
                                <ProductListRowSkeleton />
                            </div>
                        )
                    ) : products.length === 0 ? (
                        <section className="grid justify-items-center gap-3 py-12 text-center">
                            <FaMagnifyingGlass
                                aria-hidden="true"
                                className="text-ui-300 size-8"
                            />
                            <p className="text-ui-500 text-sm">
                                {hasFilters
                                    ? 'No products matched your search.'
                                    : 'No products yet.'}
                            </p>
                        </section>
                    ) : view === 'cards' ? (
                        <div
                            className={`grid gap-4 transition-opacity duration-150 sm:grid-cols-2 xl:grid-cols-3 ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
                        >
                            {products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                />
                            ))}
                        </div>
                    ) : (
                        <div
                            className={`border-ui-200 bg-ui-0 divide-ui-200 divide-y overflow-visible rounded border transition-opacity duration-150 ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
                        >
                            {products.map((product) => (
                                <ProductListRow
                                    key={product.id}
                                    onNavigate={navigate}
                                    product={product}
                                />
                            ))}
                        </div>
                    )}

                    <Pagination
                        onChange={goToPage}
                        page={page}
                        totalPages={stablePages.current}
                    />
                </div>
            </div>
        </section>
    );
}
