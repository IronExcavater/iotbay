import { AccessLogsTable } from '@features/access-logs/components/AccessLogsTable';
import { AdminActiveSessionsTable } from '@features/access-logs/components/AdminActiveSessionsTable';
import { useDocumentTitle } from '@shared/hooks/useDocumentTitle';

export default function AdminAccessLogsPage() {
    useDocumentTitle('Access logs');
    return (
        <section className="grid gap-6">
            <AdminActiveSessionsTable />
            <AccessLogsTable admin />
        </section>
    );
}
