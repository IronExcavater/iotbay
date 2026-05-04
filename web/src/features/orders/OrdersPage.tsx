import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { PageHeader } from '@shared/ui/PageHeader';

export default function OrdersPage() {
    useDocumentTitle('Orders');
    return (
        <section className="grid gap-6">
            <PageHeader
                description="Orders placed from this account will appear here."
                title="Orders"
            />
        </section>
    );
}
