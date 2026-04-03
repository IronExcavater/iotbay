import { DateTime } from 'luxon';

export type DateDisplay = 'long' | 'relative' | 'short';
export const DEFAULT_LOCALE = 'en-AU';

export function formatDateTime(
    value: string,
    display: DateDisplay = 'short',
    locale = DEFAULT_LOCALE
) {
    const date = DateTime.fromISO(value, { locale });
    if (!date.isValid) {
        return value;
    }

    switch (display) {
        case 'long':
            return date.toLocaleString(DateTime.DATETIME_MED);
        case 'relative':
            return (
                date.toRelative({ locale }) ??
                date.toLocaleString(DateTime.DATETIME_MED)
            );
        case 'short':
        default:
            return date.toLocaleString(DateTime.DATE_MED);
    }
}
