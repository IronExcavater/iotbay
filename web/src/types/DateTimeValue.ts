import { DateTime } from 'luxon';

export type DateDisplay = 'long' | 'relative' | 'short';

export class DateTimeValue {
    static readonly DEFAULT_LOCALE = 'en-AU';

    constructor(readonly value: string) {}

    static format(
        value: string,
        display: DateDisplay = 'short',
        locale = DateTimeValue.DEFAULT_LOCALE
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
}
