import { AccessLogsTable } from '@features/access-logs/components/AccessLogsTable';
import { AdminActiveSessionsTable } from '@features/access-logs/components/AdminActiveSessionsTable';

export default function AdminAccessLogsPage() {
    return (
        <section className="grid gap-6">
            <AdminActiveSessionsTable />
            <AccessLogsTable admin />
        </section>
    );
}
