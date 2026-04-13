import { useEffect, useState } from 'react';
import { FaGithub } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

import { getJson } from '../services/http';
import { textButtonClassName } from './form/Button';

const DEFAULT_CONTACT_EMAIL = 'support@iotbay.com';
const GITHUB_REPOSITORY_URL =
    'https://github.com/isd-2026/project-assignment-iotbay-marketplace-workshop04-group3';

export default function SiteFooter() {
    // App metadata is optional at runtime, so the footer keeps a stable
    // support address even when the app-info request fails.
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
                if (!abortController.signal.aborted) {
                    setContactEmail(DEFAULT_CONTACT_EMAIL);
                }
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
                            to="/staff/sign-in?next=/admin"
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
                            title="View IoTBay on GitHub"
                            target="_blank"
                        >
                            <FaGithub aria-hidden="true" size={20} />
                            <span>IoTBay</span>
                        </a>
                    </div>
                </section>
            </div>
        </footer>
    );
}
