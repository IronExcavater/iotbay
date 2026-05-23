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
import { ProductRow } from '@features/products/components/ProductRow';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { toErrorMessage } from '@shared/services/http';
import { Checkbox } from '@shared/ui/form/Checkbox';
import { SearchInput } from '@shared/ui/form/SearchInput';
import { PageHeader } from '@shared/ui/PageHeader';
import { Pagination } from '@shared/ui/Pagination';
import { Money } from '@shared/value-objects/Money';

type CatalogueView = 'cards' | 'list';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRICE_MAX = 5000;
const PRICE_STEP = 50;

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

// ── Price range slider ────────────────────────────────────────────────────────

function PriceRangeSlider({
    onChange,
    range,
}: {
    onChange: (range: [number, number]) => void;
    range: [number, number];
}) {
    const [min, max] = range;
    const leftPct = (min / PRICE_MAX) * 100;
    const rightPct = (max / PRICE_MAX) * 100;
    const minIsAtMax = min >= max - PRICE_STEP;

    return (
        <div className="grid gap-3">
            <div className="relative h-5">
                <div className="bg-ui-200 absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full">
                    <div
                        className="bg-ui-900 absolute inset-y-0 rounded-full"
                        style={{
                            left: `${leftPct}%`,
                            right: `${100 - rightPct}%`,
                        }}
                    />
                </div>
                <input
                    aria-label="Minimum price"
                    className={`dual-range absolute inset-0 h-full w-full appearance-none bg-transparent ${minIsAtMax ? 'z-2' : 'z-1'}`}
                    max={PRICE_MAX}
                    min={0}
                    onChange={(e) => {
                        const next = Math.min(
                            Number(e.target.value),
                            max - PRICE_STEP
                        );
                        onChange([next, max]);
                    }}
                    step={PRICE_STEP}
                    type="range"
                    value={min}
                />
                <input
                    aria-label="Maximum price"
                    className={`dual-range absolute inset-0 h-full w-full appearance-none bg-transparent ${minIsAtMax ? 'z-1' : 'z-2'}`}
                    max={PRICE_MAX}
                    min={0}
                    onChange={(e) => {
                        const next = Math.max(
                            Number(e.target.value),
                            min + PRICE_STEP
                        );
                        onChange([min, next]);
                    }}
                    step={PRICE_STEP}
                    type="range"
                    value={max}
                />
            </div>
            <div className="text-ui-600 flex justify-between text-xs">
                <span>{min === 0 ? 'Any' : Money.format(min * 100)}</span>
                <span>
                    {max === PRICE_MAX ? 'Any' : Money.format(max * 100)}
                </span>
            </div>
        </div>
    );
}

// ── Sidebar components ─────────────────────────────────────────────────────────

const DEPTH_PADDING = ['', 'pl-4', 'pl-8', 'pl-12'] as const;

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
    const pad = DEPTH_PADDING[Math.min(depth, DEPTH_PADDING.length - 1)];

    return (
        <li>
            <div className={`flex items-center ${pad}`}>
                {hasChildren ? (
                    <button
                        aria-label={
                            expanded
                                ? `Collapse ${node.label}`
                                : `Expand ${node.label}`
                        }
                        className="focus-visible:ring-ui-900 text-ui-400 hover:text-ui-700 flex h-7 w-6 shrink-0 items-center justify-center rounded transition-colors outline-none focus-visible:ring-2"
                        onClick={() => setExpanded((e) => !e)}
                        type="button"
                    >
                        <FaChevronRight
                            aria-hidden="true"
                            className={`size-2.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
                        />
                    </button>
                ) : (
                    <span aria-hidden="true" className="w-6 shrink-0" />
                )}
                <button
                    className={`focus-visible:ring-ui-900 flex flex-1 items-center gap-1.5 rounded py-1.5 pr-2 pl-1 text-sm transition-colors outline-none focus-visible:ring-2 ${
                        isSelected
                            ? 'bg-ui-950 text-ui-0'
                            : 'text-ui-700 hover:bg-ui-100 hover:text-ui-900'
                    }`}
                    onClick={() => onSelect(isSelected ? '' : node.path)}
                    type="button"
                >
                    <span className="flex-1 truncate text-left">
                        {node.label}
                    </span>
                    <span
                        className={`shrink-0 text-xs tabular-nums ${isSelected ? 'text-ui-0/60' : 'text-ui-400'}`}
                    >
                        {node.count}
                    </span>
                </button>
            </div>
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

// ── Card overlay ───────────────────────────────────────────────────────────────

function ProductCardOverlay({ product }: { product: Product }) {
    const image = product.mediaUrls[0] ?? '/iotbay_icon_themed.svg';
    const cartItem = {
        code: product.code,
        imageUrl: image,
        name: product.name,
        priceCents: product.priceCents,
        productId: product.id,
    };
    const media = product.mediaUrls;

    return (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
            <div className="border-ui-300 bg-ui-0 flex h-full flex-col overflow-hidden rounded border shadow-xl">
                <Link
                    className="focus-visible:ring-ui-900 block shrink-0 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset"
                    to={`/products/${product.id}`}
                >
                    <div className="bg-ui-100 h-32 overflow-hidden">
                        <img
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            src={image}
                        />
                    </div>
                </Link>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
                    <h2 className="text-ui-900 leading-snug font-semibold">
                        <Link
                            className="underline-offset-4 outline-none hover:underline focus-visible:underline"
                            to={`/products/${product.id}`}
                        >
                            {product.name}
                        </Link>
                    </h2>
                    {product.description && (
                        <p className="text-ui-500 line-clamp-3 text-xs leading-5">
                            {product.description}
                        </p>
                    )}
                    {media.length > 1 && (
                        <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 py-0.5">
                            {media.map((url) => (
                                <Link
                                    key={url}
                                    className="border-ui-200 focus-visible:ring-ui-900 block size-9 shrink-0 overflow-hidden rounded border outline-none focus-visible:ring-2"
                                    to={`/products/${product.id}`}
                                >
                                    <img
                                        alt=""
                                        className="h-full w-full object-cover"
                                        src={url}
                                    />
                                </Link>
                            ))}
                        </div>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                        <p className="text-ui-900 text-lg leading-none font-semibold">
                            {Money.format(product.priceCents)}
                        </p>
                        <AddToCartControl
                            item={cartItem}
                            stock={product.stock}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Card ───────────────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
    const image = product.mediaUrls[0] ?? '/iotbay_icon_themed.svg';

    return (
        <article className="group relative z-0 hover:z-10">
            <div className="border-ui-200 bg-ui-0 grid overflow-hidden rounded border">
                <Link
                    className="focus-visible:ring-ui-900 focus-visible:ring-offset-ui-0 block overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    to={`/products/${product.id}`}
                >
                    <div className="bg-ui-100 aspect-4/3 overflow-hidden">
                        <img
                            alt={product.name}
                            className="h-full w-full object-cover"
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
                    <p className="text-ui-900 text-lg leading-none font-semibold">
                        {Money.format(product.priceCents)}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <ProductTagRow product={product} />
                        <StockStatus product={product} />
                    </div>
                </div>
            </div>
            <ProductCardOverlay product={product} />
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
        <article className="group hover:bg-ui-50 relative z-0 transition-colors hover:z-20">
            <ProductRow
                imageUrl={image}
                name={product.name}
                onImageClick={() => onNavigate(`/products/${product.id}`)}
                productId={product.id}
                middle={
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-ui-900 font-semibold">
                            {Money.format(product.priceCents)}
                        </span>
                        <ProductTagRow product={product} />
                        <StockStatus product={product} />
                    </div>
                }
            />

            {/* Full overlay */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                <div className="border-ui-300 bg-ui-0 overflow-hidden rounded border shadow-xl">
                    <ProductRow
                        imageUrl={image}
                        name={product.name}
                        productId={product.id}
                        middle={
                            <>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="text-ui-900 font-semibold">
                                        {Money.format(product.priceCents)}
                                    </span>
                                    <ProductTagRow product={product} />
                                    <StockStatus product={product} />
                                </div>
                                {product.description && (
                                    <p className="text-ui-500 mt-1.5 line-clamp-2 text-xs leading-5">
                                        {product.description}
                                    </p>
                                )}
                                {product.mediaUrls.length > 1 && (
                                    <div className="-mx-0.5 mt-2 flex gap-1.5 overflow-x-auto px-0.5 py-0.5">
                                        {product.mediaUrls.map((url) => (
                                            <Link
                                                key={url}
                                                className="border-ui-200 focus-visible:ring-ui-900 block size-10 shrink-0 overflow-hidden rounded border outline-none focus-visible:ring-2"
                                                to={`/products/${product.id}`}
                                            >
                                                <img
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                    src={url}
                                                />
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </>
                        }
                        right={
                            <AddToCartControl
                                item={cartItem}
                                stock={product.stock}
                            />
                        }
                    />
                </div>
            </div>
        </article>
    );
}

function ProductListRowSkeleton() {
    return (
        <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center">
            <div className="bg-ui-100 h-16 animate-pulse" />
            <div className="grid gap-2 px-4 py-3.5">
                <div className="bg-ui-200 h-4 w-44 max-w-full animate-pulse rounded-full" />
                <div className="bg-ui-100 h-3 w-24 animate-pulse rounded-full" />
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
    const [priceRange, setPriceRange] = useState<[number, number]>([
        0,
        PRICE_MAX,
    ]);
    const debouncedPriceRange = useDebounce(priceRange, 300);
    const [inStock, setInStock] = useState(false);
    const [view, setView] = useState<CatalogueView>('cards');

    const [products, setProducts] = useState<Product[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [productsError, setProductsError] = useState<string | null>(null);

    const [types, setTypes] = useState<ProductTypeCount[]>([]);

    const stablePages = useRef(totalPages);
    if (!isLoading) stablePages.current = totalPages;

    const minPriceCents =
        debouncedPriceRange[0] > 0 ? debouncedPriceRange[0] * 100 : undefined;
    const maxPriceCents =
        debouncedPriceRange[1] < PRICE_MAX
            ? debouncedPriceRange[1] * 100
            : undefined;

    useEffect(() => {
        const ac = new AbortController();
        setIsLoading(true);

        void productApi
            .list(
                {
                    page,
                    search: debouncedSearch.trim() || undefined,
                    type: selectedType || undefined,
                    minPriceCents,
                    maxPriceCents,
                    inStock: inStock || undefined,
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
    }, [
        debouncedSearch,
        selectedType,
        page,
        minPriceCents,
        maxPriceCents,
        inStock,
    ]);

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
    const priceFiltered = priceRange[0] > 0 || priceRange[1] < PRICE_MAX;
    const hasFilters = Boolean(
        debouncedSearch.trim() || selectedType || priceFiltered || inStock
    );

    return (
        <section className="grid gap-6">
            <PageHeader
                description="Find devices for monitoring, automation, security, and connected living."
                title="Catalogue"
            />

            <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
                {/* ── Sidebar ────────────────────────────────────────────── */}
                <aside className="grid gap-4 lg:sticky lg:top-6 lg:self-start">
                    <SearchInput
                        className="w-full"
                        onChange={setSearch}
                        placeholder="Search catalogue"
                        value={search}
                    />

                    {/* Unified filter panel */}
                    <div className="bg-ui-0 border-ui-200 overflow-hidden rounded border">
                        <div className="border-ui-200 flex items-center justify-between border-b px-3 py-2.5">
                            <span className="text-ui-700 text-xs font-semibold tracking-[0.08em] uppercase">
                                Filters
                            </span>
                            {(priceFiltered || inStock) && (
                                <button
                                    className="text-ui-500 hover:text-ui-900 text-xs transition-colors"
                                    onClick={() => {
                                        setPriceRange([0, PRICE_MAX]);
                                        setInStock(false);
                                    }}
                                    type="button"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Price range */}
                        <div className="border-ui-100 border-b px-3 py-3.5">
                            <p className="text-ui-600 mb-3 text-xs font-medium">
                                Price
                            </p>
                            <PriceRangeSlider
                                onChange={setPriceRange}
                                range={priceRange}
                            />
                        </div>

                        {/* In stock */}
                        <div className="px-3 py-3">
                            <Checkbox checked={inStock} onChange={setInStock}>
                                In stock only
                            </Checkbox>
                        </div>

                        {/* Category */}
                        {typeTree.length > 0 && (
                            <div className="border-ui-100 border-t">
                                <div className="border-ui-100 flex items-center justify-between border-b px-3 py-2">
                                    <p className="text-ui-600 text-xs font-medium">
                                        Category
                                    </p>
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
                    </div>
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
