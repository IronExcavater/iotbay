import { useProductsPage } from '../products/useProductsPage';

export default function HomePage() {
    const {
        formError,
        formValues,
        handleSubmit,
        isLoadingProducts,
        isSubmitting,
        products,
        productsError,
        setFieldValue,
    } = useProductsPage();

    return (
        <section className="grid gap-8">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Products
            </h1>

            <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
                <div className="overflow-hidden rounded border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                        <h2 className="text-lg font-semibold">Product list</h2>
                    </div>

                    {isLoadingProducts ? (
                        <p className="px-5 py-4 text-slate-500">
                            Loading products.
                        </p>
                    ) : productsError ? (
                        <p className="px-5 py-4 text-red-700">
                            {productsError}
                        </p>
                    ) : products.length === 0 ? (
                        <p className="px-5 py-4 text-slate-500">
                            No products yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-5 py-3 font-medium">
                                            Code
                                        </th>
                                        <th className="px-5 py-3 font-medium">
                                            Name
                                        </th>
                                        <th className="px-5 py-3 font-medium">
                                            Price
                                        </th>
                                        <th className="px-5 py-3 font-medium">
                                            Created
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => (
                                        <tr
                                            className="border-t border-slate-200"
                                            key={product.id}
                                        >
                                            <td className="px-5 py-3 font-mono text-xs text-slate-600">
                                                {product.code}
                                            </td>
                                            <td className="px-5 py-3">
                                                {product.name}
                                            </td>
                                            <td className="px-5 py-3">
                                                {formatPrice(
                                                    product.priceCents
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-slate-500">
                                                {formatDate(product.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <section className="rounded border border-slate-200 bg-white p-5">
                    <h2 className="text-lg font-semibold">Create product</h2>

                    <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
                        <label className="grid gap-1 text-sm">
                            <span>Name</span>
                            <input
                                className="rounded border border-slate-300 px-3 py-2"
                                onChange={(event) => {
                                    setFieldValue('name', event.target.value);
                                }}
                                value={formValues.name}
                            />
                        </label>

                        <label className="grid gap-1 text-sm">
                            <span>Code</span>
                            <input
                                className="rounded border border-slate-300 px-3 py-2"
                                onChange={(event) => {
                                    setFieldValue('code', event.target.value);
                                }}
                                value={formValues.code}
                            />
                        </label>

                        <label className="grid gap-1 text-sm">
                            <span>Price cents</span>
                            <input
                                className="rounded border border-slate-300 px-3 py-2"
                                inputMode="numeric"
                                onChange={(event) => {
                                    setFieldValue(
                                        'priceCents',
                                        event.target.value
                                    );
                                }}
                                value={formValues.priceCents}
                            />
                        </label>

                        {formError ? (
                            <p className="text-sm text-red-700">{formError}</p>
                        ) : null}

                        <button
                            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                            disabled={isSubmitting}
                            type="submit"
                        >
                            {isSubmitting ? 'Saving...' : 'Create product'}
                        </button>
                    </form>
                </section>
            </section>
        </section>
    );
}

function formatPrice(priceCents: number) {
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
    }).format(priceCents / 100);
}

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('en-AU');
}
