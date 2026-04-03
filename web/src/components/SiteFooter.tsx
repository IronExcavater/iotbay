import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getJson } from '../services/http';
import { textButtonClassName } from './form/Button';

const DEFAULT_CONTACT_EMAIL = 'support@iotbay.com';
const GITHUB_REPOSITORY_URL =
    'https://github.com/isd-2026/project-assignment-iotbay-marketplace-workshop04-group3';

export default function SiteFooter() {
    const [contactEmail, setContactEmail] = useState(DEFAULT_CONTACT_EMAIL);

    useEffect(() => {
        const abortController = new AbortController();

        async function loadAppInfo() {
            try {
                const payload = await getJson<{
                    contactEmail?: string;
                }>('/api/app', abortController.signal);
                if (payload.contactEmail) {
                    setContactEmail(payload.contactEmail);
                }
            } catch {
                // Keep the default contact email when app info is unavailable.
            }
        }

        void loadAppInfo();
        return () => abortController.abort();
    }, []);

    return (
        <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-center gap-x-8 gap-y-8 px-4 py-8 text-sm text-slate-600 sm:px-6">
                <section className="flex min-w-0 flex-[1_1_12rem] justify-center">
                    <div className="flex w-fit flex-col items-start gap-2 text-left">
                        <h2 className="font-semibold text-slate-900">
                            Sitemap
                        </h2>
                        <Link className={textButtonClassName} to="/">
                            Home
                        </Link>
                        <Link className={textButtonClassName} to="/account">
                            Account
                        </Link>
                        <Link
                            className={textButtonClassName}
                            to="/auth?mode=signin&userType=staff&next=/admin"
                        >
                            Staff portal
                        </Link>
                    </div>
                </section>

                <section className="flex min-w-0 flex-[1_1_12rem] justify-center">
                    <div className="flex w-fit flex-col items-start gap-2 text-left">
                        <h2 className="font-semibold text-slate-900">
                            Contact
                        </h2>
                        <a
                            className={textButtonClassName}
                            href={`mailto:${contactEmail}`}
                        >
                            {contactEmail}
                        </a>
                    </div>
                </section>

                <section className="flex min-w-0 flex-[1_1_12rem] justify-center">
                    <div className="flex w-fit flex-col items-start gap-2 text-left">
                        <h2 className="font-semibold text-slate-900">
                            Credits
                        </h2>
                        <p>ISD 2026</p>
                        <a
                            aria-label="IoTBay on GitHub"
                            className={textButtonClassName}
                            href={GITHUB_REPOSITORY_URL}
                            rel="noreferrer"
                            target="_blank"
                        >
                            <GitHubIcon />
                            <span>IoTBay</span>
                        </a>
                    </div>
                </section>
            </div>
        </footer>
    );
}

function GitHubIcon() {
    return (
        <svg
            aria-hidden="true"
            fill="currentColor"
            height="20"
            viewBox="0 0 24 24"
            width="20"
        >
            <path d="M12 .5C5.65.5.5 5.65.5 12A11.5 11.5 0 0 0 8.36 22.3c.58.1.79-.25.79-.56v-1.96c-3.1.68-3.75-1.5-3.75-1.5-.5-1.28-1.24-1.62-1.24-1.62-1.01-.7.08-.69.08-.69 1.12.08 1.7 1.15 1.7 1.15 1 .1 1.95.69 2.42 1.69.1-.72.39-1.21.7-1.49-2.47-.28-5.07-1.24-5.07-5.51 0-1.22.43-2.21 1.15-2.99-.12-.28-.5-1.41.11-2.95 0 0 .94-.3 3.08 1.14a10.67 10.67 0 0 1 5.6 0c2.13-1.45 3.07-1.14 3.07-1.14.62 1.54.24 2.67.12 2.95.72.78 1.15 1.77 1.15 2.99 0 4.28-2.61 5.22-5.1 5.49.4.35.76 1.03.76 2.08v3.08c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
        </svg>
    );
}
