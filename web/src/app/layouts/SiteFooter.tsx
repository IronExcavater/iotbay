import { useEffect, useState } from 'react';
import { FaGithub } from 'react-icons/fa6';

import { useAuth } from '@features/auth/AuthProvider';
import { getJson } from '@shared/services/http';
import { TextAnchor, TextLink } from '@shared/ui/form/TextLink';

const DEFAULT_CONTACT_EMAIL = 'support@iotbay.com';
const UTS_ISD_SUBJECT_URL =
    'https://coursehandbook.uts.edu.au/subject/2026/41025';
const GITHUB_REPOSITORY_URL =
    'https://github.com/isd-2026/project-assignment-iotbay-marketplace-workshop04-group3';

export default function SiteFooter() {
    const { user } = useAuth();
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

    const showStaffPortal = !user || user.userType === 'staff';
    const staffPortalHref =
        user?.userType === 'staff' ? '/admin' : '/staff/sign-in?next=/admin';

    return (
        <footer className="bg-ui-0 border-ui-200 border-t">
            <div className="text-ui-600 mx-auto flex w-full max-w-6xl flex-wrap justify-center gap-x-8 gap-y-8 px-4 py-8 text-sm sm:px-6">
                <section className="flex min-w-0 flex-[1_1_12rem] justify-center">
                    <div className="flex w-fit flex-col items-start gap-2 text-left">
                        <h2 className="text-ui-900 font-semibold">Navigate</h2>
                        <TextLink to="/">Home</TextLink>
                        <TextLink to="/products">Catalogue</TextLink>
                        <TextLink to="/orders">Orders</TextLink>
                        <TextLink to="/account">Account</TextLink>
                        {showStaffPortal && (
                            <TextAnchor href={staffPortalHref}>
                                Staff portal
                            </TextAnchor>
                        )}
                    </div>
                </section>

                <section className="flex min-w-0 flex-[1_1_12rem] justify-center">
                    <div className="flex w-fit flex-col items-start gap-2 text-left">
                        <h2 className="text-ui-900 font-semibold">Support</h2>
                        <TextAnchor href={`mailto:${contactEmail}`}>
                            {contactEmail}
                        </TextAnchor>
                    </div>
                </section>

                <section className="flex min-w-0 flex-[1_1_12rem] justify-center">
                    <div className="flex w-fit flex-col items-start gap-2 text-left">
                        <h2 className="text-ui-900 font-semibold">Credits</h2>
                        <TextAnchor
                            aria-label="Introduction to Software Development at UTS"
                            href={UTS_ISD_SUBJECT_URL}
                            rel="noreferrer"
                            target="_blank"
                        >
                            <span
                                aria-hidden="true"
                                className="mask-uts-icon inline-block size-5 shrink-0 bg-current"
                            />
                            <span>ISD 2026</span>
                        </TextAnchor>
                        <TextAnchor
                            aria-label="IoTBay on GitHub"
                            href={GITHUB_REPOSITORY_URL}
                            rel="noreferrer"
                            target="_blank"
                        >
                            <FaGithub aria-hidden="true" size={20} />
                            <span>IoTBay</span>
                        </TextAnchor>
                    </div>
                </section>
            </div>
        </footer>
    );
}
