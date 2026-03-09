import { Link } from 'react-router-dom';

export default function PageHeader() {
    return (
        <header className="flex items-center justify-between border-b border-gray-200 pb-4">
            <Link className="text-2xl font-semibold text-gray-900" to="/">
                IOTBay
            </Link>
            <span className="text-sm text-gray-600">Scaffold</span>
        </header>
    );
}
