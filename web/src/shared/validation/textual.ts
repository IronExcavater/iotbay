import {
    StringValidator,
    type StringValidatorOptions,
} from '@shared/validation/strings';

const EMAIL_PATTERN =
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
const NAME_PATTERN = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;

export class ChoiceValidator extends StringValidator {
    constructor(
        options: StringValidatorOptions,
        private readonly choices: readonly string[]
    ) {
        super(options);
    }

    override validate(value: string) {
        const normalized = super.validate(value);
        if (normalized && !this.choices.includes(normalized)) {
            this.fail(`${this.options.fieldName} is invalid`);
        }
        return normalized;
    }
}

export class EmailValidator extends StringValidator {
    override sanitizeInput(value: string, context?: Record<string, unknown>) {
        return super
            .sanitizeInput(value, context)
            .replace(/\s+/g, '')
            .replace(/[^A-Za-z0-9.!#$%&'*+/=?^_`{|}~@-]/g, '')
            .toLowerCase();
    }

    override validate(value: string) {
        const normalized = super.validate(value);
        if (normalized && !EMAIL_PATTERN.test(normalized)) {
            this.fail(`${this.options.fieldName} must be valid`);
        }
        return normalized;
    }
}

export class NameValidator extends StringValidator {
    override sanitizeInput(value: string, context?: Record<string, unknown>) {
        return super.sanitizeInput(value, context).replace(/[^A-Za-z' -]/g, '');
    }

    override validate(value: string) {
        const normalized = super.validate(value);
        if (normalized && !NAME_PATTERN.test(normalized)) {
            this.fail(
                `${this.options.fieldName} must use letters, spaces, apostrophes or hyphens`
            );
        }
        return normalized;
    }
}

export class AddressValidator extends StringValidator {
    override sanitizeInput(value: string, context?: Record<string, unknown>) {
        return super
            .sanitizeInput(value, context)
            .replace(/[^A-Za-z0-9 /#.,:&'()-]/g, '');
    }
}
