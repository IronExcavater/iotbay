import { DateTime } from 'luxon';

import { StringValidator } from './strings';

export class DateValidator extends StringValidator {
    override validate(value: string) {
        const normalized = super.validate(value);
        if (normalized && !DateTime.fromISO(normalized).isValid) {
            this.fail(`${this.options.fieldName} must be a valid date`);
        }
        return normalized;
    }
}

export class DateTimeValidator extends StringValidator {
    override validate(value: string) {
        const normalized = super.validate(value);
        if (normalized && !DateTime.fromISO(normalized).isValid) {
            this.fail(`${this.options.fieldName} must be a valid datetime`);
        }
        return normalized;
    }
}
