import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';
import { PageHeader } from '@shared/ui/PageHeader';

export default function OrdersPage() {
    useDocumentTitle('Orders');
    return (
        <section className="grid gap-6">
            <PageHeader
                description="Order history and delivery tracking."
                title="Orders"
            />
        </section>
    );
}
