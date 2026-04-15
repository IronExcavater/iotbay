import {
    FaArrowsRotate,
    FaPenToSquare,
    FaTrashCan,
} from 'react-icons/fa6';

import { Button } from '../../../components/form/Button';
import { SearchInput } from '../../../components/form/SearchInput';
import { ActionMenu } from '../../../components/overlay/ActionMenu';
import {
    Table,
    TableActionCell,
    TableHead,
    TableLoadingRow,
    TableMessageRow,
} from '../../../components/table/Table';
import type { Product } from '../../../products/api';
import { DateTimeValue } from '../../../types/DateTimeValue';
import { Money } from '../../../types/Money';

interface ProductTableProps {
    hasSearch: boolean;
    isLoading: boolean;
    onCreate: () => void;
    onDelete: (product: Product) => void;
    onEdit: (product: Product) => void;
    onRefresh: () => void;
    products: Product[];
    productsError: string | null;
    search: string;
    setSearch: (value: string) => void;
}

export function ProductTable({
    hasSearch,
    isLoading,
    onCreate,
    onDelete,
    onEdit,
    onRefresh,
    products,
    productsError,
    search,
    setSearch,
}: ProductTableProps) {
    return (
        <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Products
                    </h2>

                    <Button
                        aria-label="Refresh products"
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full p-0"
                        onClick={onRefresh}
                        title="Refresh products"
                        type="button"
                        variant="ghost"
                    >
                        <FaArrowsRotate aria-hidden="true" className="size-3.5" />
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
                        <col className="w-[18%]" />
                        <col className="w-[38%]" />
                        <col className="w-[16%]" />
                        <col className="w-[22%]" />
                        <col className="w-[6%]" />
                    </colgroup>
                    <TableHead>
                        <tr>
                            <th className="px-5 py-3">Code</th>
                            <th className="px-5 py-3">Name</th>
                            <th className="px-5 py-3">Price</th>
                            <th className="px-5 py-3">Updated</th>
                            <th className="px-2 py-3 text-right">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </TableHead>
                    <tbody>
                        {isLoading ? (
                            <>
                                <TableLoadingRow colSpan={5} />
                                <TableLoadingRow colSpan={5} />
                                <TableLoadingRow colSpan={5} />
                            </>
                        ) : productsError ? (
                            <TableMessageRow
                                colSpan={5}
                                message={productsError}
                                tone="error"
                            />
                        ) : products.length === 0 && !hasSearch ? (
                            <TableMessageRow
                                colSpan={5}
                                message="No products yet"
                                tone="muted"
                            />
                        ) : products.length === 0 ? (
                            <TableMessageRow
                                colSpan={5}
                                message="No products matched your search."
                                tone="muted"
                            />
                        ) : (
                            products.map((product) => (
                                <tr
                                    className="border-t border-slate-200 align-top"
                                    key={product.id}
                                >
                                    <td className="px-5 py-3">
                                        <span className="flex min-h-8 items-center font-mono text-xs text-slate-500">
                                            {product.code}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="flex min-h-8 items-center truncate font-medium text-slate-900">
                                            {product.name}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="flex min-h-8 items-center">
                                            {Money.format(product.priceCents)}
                                        </span>
                                    </td>
                                    <td
                                        className="px-5 py-3 text-slate-500"
                                        title={DateTimeValue.format(
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
                                    </td>
                                    <TableActionCell>
                                        <ActionMenu
                                            items={[
                                                {
                                                    icon: FaPenToSquare,
                                                    label: 'Edit',
                                                    onSelect: () => onEdit(product),
                                                },
                                                {
                                                    icon: FaTrashCan,
                                                    label: 'Delete',
                                                    onSelect: () => onDelete(product),
                                                    tone: 'danger',
                                                },
                                            ]}
                                            label="Open product actions"
                                        />
                                    </TableActionCell>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </div>
        </section>
    );
}
