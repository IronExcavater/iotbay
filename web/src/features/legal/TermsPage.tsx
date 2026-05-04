import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { PageHeader } from '@shared/ui/PageHeader';

export default function TermsPage() {
    useDocumentTitle('Terms and conditions');

    return (
        <section className="mx-auto grid max-w-3xl gap-6">
            <PageHeader
                description="Read the account, order, product, and privacy terms that apply to IoTBay."
                title="Terms and conditions"
            />

            <div className="bg-ui-0 border-ui-200 grid gap-5 rounded border p-5 text-sm leading-6">
                <section className="grid gap-2">
                    <h2 className="text-ui-900 text-lg font-semibold">
                        Accounts
                    </h2>
                    <p className="text-ui-600">
                        You are responsible for keeping your account details
                        accurate, protecting your sign-in credentials, and
                        telling us promptly if you believe your account has been
                        used without permission.
                    </p>
                </section>

                <section className="grid gap-2">
                    <h2 className="text-ui-900 text-lg font-semibold">
                        Orders
                    </h2>
                    <p className="text-ui-600">
                        Order details must be checked before submission,
                        including the selected items, prices, and delivery
                        address. Any order flow in this application may be
                        reviewed before fulfilment.
                    </p>
                </section>

                <section className="grid gap-2">
                    <h2 className="text-ui-900 text-lg font-semibold">
                        Product information
                    </h2>
                    <p className="text-ui-600">
                        Product images, descriptions, availability, and prices
                        are provided for catalogue use and may change as product
                        records are updated.
                    </p>
                </section>

                <section className="grid gap-2">
                    <h2 className="text-ui-900 text-lg font-semibold">
                        Privacy
                    </h2>
                    <p className="text-ui-600">
                        Account, contact, and address details are used to
                        operate the website, support account security, and
                        prepare order information.
                    </p>
                </section>
            </div>
        </section>
    );
}
