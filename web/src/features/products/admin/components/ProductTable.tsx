import { FaArrowsRotate, FaPenToSquare, FaTrashCan } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';

import type { Product } from '@features/products/api';
import { Button } from '@shared/ui/form/Button';
import { SearchInput } from '@shared/ui/form/SearchInput';
import { ActionMenu } from '@shared/ui/overlay/ActionMenu';
import { Pagination } from '@shared/ui/Pagination';
import {
    Table,
    TableActionCell,
    TableHead,
    TableLoadingRow,
    TableMessageRow,
    TablePrimaryActionRow,
} from '@shared/ui/table/Table';
import { Tooltip } from '@shared/ui/Tooltip';
import { DateTimeValue } from '@shared/value-objects/DateTimeValue';
import { Money } from '@shared/value-objects/Money';

interface ProductTableProps {
    hasSearch: boolean;
    isLoading: boolean;
    onCreate: () => void;
    onDelete: (product: Product) => void;
    onPageChange: (page: number) => void;
    onRefresh: () => void;
    page: number;
    products: Product[];
    productsError: string | null;
    search: string;
    setSearch: (value: string) => void;
    totalPages: number;
}

export function ProductTable({
    hasSearch,
    isLoading,
    onCreate,
    onDelete,
    onPageChange,
    onRefresh,
    page,
    products,
    productsError,
    search,
    setSearch,
    totalPages,
}: ProductTableProps) {
    const navigate = useNavigate();

    return (
        <section className="bg-ui-0 border-ui-200 overflow-hidden rounded border">
            <div className="border-ui-200 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-ui-900 text-xl font-semibold">
                        Products
                    </h2>

                    <Button
                        aria-label="Refresh products"
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full p-0"
                        onClick={onRefresh}
                        type="button"
                        variant="ghost"
                    >
                        <FaArrowsRotate
                            aria-hidden="true"
                            className="size-3.5"
                        />
                    </Button>
                </div>

                <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                    <SearchInput
                        className="max-w-full sm:w-72 md:w-80"
                        onChange={setSearch}
                        placeholder="Search products"
                        value={search}
                    />

                    <Button onClick={onCreate} type="button" variant="primary">
                        Create product
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <colgroup>
                        <col className="w-[14%]" />
                        <col className="w-[24%]" />
                        <col className="w-[14%]" />
                        <col className="w-[12%]" />
                        <col className="w-[10%]" />
                        <col className="w-[18%]" />
                        <col className="w-[8%]" />
                    </colgroup>
                    <TableHead>
                        <tr>
                            <th className="px-5 py-3">Code</th>
                            <th className="px-5 py-3">Name</th>
                            <th className="px-5 py-3">Type</th>
                            <th className="px-5 py-3">Price</th>
                            <th className="px-5 py-3">Stock</th>
                            <th className="px-5 py-3">Updated</th>
                            <th className="px-2 py-3 text-right">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </TableHead>
                    <tbody>
                        {isLoading ? (
                            <>
                                <TableLoadingRow colSpan={7} />
                                <TableLoadingRow colSpan={7} />
                                <TableLoadingRow colSpan={7} />
                            </>
                        ) : productsError ? (
                            <TableMessageRow
                                colSpan={7}
                                message={productsError}
                                tone="error"
                            />
                        ) : products.length === 0 && !hasSearch ? (
                            <TableMessageRow
                                colSpan={7}
                                message="No products yet"
                                tone="muted"
                            />
                        ) : products.length === 0 ? (
                            <TableMessageRow
                                colSpan={7}
                                message="No products matched your search."
                                tone="muted"
                            />
                        ) : (
                            products.map((product) => (
                                <TablePrimaryActionRow
                                    key={product.id}
                                    label={`View ${product.name}`}
                                    onAction={() => {
                                        navigate(
                                            `/admin/products/${product.id}`
                                        );
                                    }}
                                >
                                    <td className="px-5 py-3">
                                        <span className="text-ui-500 flex min-h-8 items-center font-mono text-xs">
                                            {product.code}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="text-ui-900 flex min-h-8 items-center truncate font-medium">
                                            {product.name}
                                        </span>
                                    </td>
                                    <td className="text-ui-600 px-5 py-3">
                                        <span className="flex min-h-8 items-center">
                                            {product.type}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="flex min-h-8 items-center">
                                            {Money.format(product.priceCents)}
                                        </span>
                                    </td>
                                    <td className="text-ui-600 px-5 py-3">
                                        <span className="flex min-h-8 items-center">
                                            {product.stock}
                                        </span>
                                    </td>
                                    <td className="text-ui-500 px-5 py-3">
                                        <Tooltip
                                            label={DateTimeValue.format(
                                                product.updatedAt,
                                                'long'
                                            )}
                                        >
                                            <span className="flex min-h-8 items-center">
                                                {DateTimeValue.format(
                                                    product.updatedAt,
                                                    'relative'
                                                )}
                                            </span>
                                        </Tooltip>
                                    </td>
                                    <TableActionCell>
                                        <div
                                            onClick={(event) => {
                                                event.stopPropagation();
                                            }}
                                        >
                                            <ActionMenu
                                                items={[
                                                    {
                                                        icon: FaPenToSquare,
                                                        label: 'Edit',
                                                        onSelect: () =>
                                                            navigate(
                                                                `/admin/products/${product.id}`
                                                            ),
                                                    },
                                                    {
                                                        icon: FaTrashCan,
                                                        label: 'Delete',
                                                        onSelect: () =>
                                                            onDelete(product),
                                                        tone: 'danger',
                                                    },
                                                ]}
                                                label="Open product actions"
                                            />
                                        </div>
                                    </TableActionCell>
                                </TablePrimaryActionRow>
                            ))
                        )}
                    </tbody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="border-ui-200 border-t px-5 py-3">
                    <Pagination
                        onChange={onPageChange}
                        page={page}
                        totalPages={totalPages}
                    />
                </div>
            )}
        </section>
    );
}
