import { Validator } from './base';

export class NumberValidator<TInput = number> extends Validator<
    TInput,
    number
> {
    constructor(
        protected readonly fieldName: string,
        protected readonly options: {
            max?: number;
            min?: number;
        } = {}
    ) {
        super();
    }

    validate(value: TInput) {
        return this.validateNumber(this.toNumber(value));
    }

    protected toNumber(value: TInput): number {
        if (typeof value !== 'number') {
            this.fail(this.invalidTypeMessage());
        }
        return value;
    }

    protected validateNumber(value: number) {
        if (!Number.isInteger(value)) {
            this.fail(this.invalidTypeMessage());
        }
        if (this.options.min !== undefined && value < this.options.min) {
            this.fail(this.tooSmallMessage());
        }
        if (this.options.max !== undefined && value > this.options.max) {
            this.fail(this.tooLargeMessage());
        }
        return value;
    }

    protected invalidTypeMessage() {
        return `${this.fieldName} must be an integer`;
    }

    protected tooSmallMessage() {
        return `${this.fieldName} must be at least ${this.options.min}`;
    }

    protected tooLargeMessage() {
        return `${this.fieldName} must be ${this.options.max} or fewer`;
    }
}

export class MoneyValidator extends NumberValidator<string> {
    constructor(
        fieldName: string,
        options: {
            maxCents: number;
        }
    ) {
        super(fieldName, { min: 0, max: options.maxCents });
    }

    override formatInput(value: string) {
        const sanitized = value.replace(/[^\d.,]/g, '');
        const separatorIndex = sanitized.search(/[.,]/);
        if (separatorIndex < 0) {
            return sanitized;
        }

        const integerPart = sanitized
            .slice(0, separatorIndex)
            .replace(/[.,]/g, '');
        const fractionalPart = sanitized
            .slice(separatorIndex + 1)
            .replace(/[.,]/g, '')
            .slice(0, 2);
        const separator = sanitized[separatorIndex] === ',' ? ',' : '.';

        return fractionalPart
            ? `${integerPart}${separator}${fractionalPart}`
            : `${integerPart}${separator}`;
    }

    protected override toNumber(value: string) {
        const normalized = this.formatInput(value).replace(',', '.');
        if (!normalized) {
            this.fail(`${this.fieldName} is required`);
        }
        if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
            this.fail(`${this.fieldName} must be in dollars`);
        }

        const [dollars, cents = ''] = normalized.split('.');
        const valueInCents =
            Number.parseInt(dollars, 10) * 100 +
            Number.parseInt(cents.padEnd(2, '0'), 10);

        if (!Number.isSafeInteger(valueInCents)) {
            this.fail(`${this.fieldName} is invalid`);
        }
        return valueInCents;
    }

    protected override tooSmallMessage() {
        return `${this.fieldName} must be zero or greater`;
    }

    protected override tooLargeMessage() {
        return `${this.fieldName} is too large`;
    }
}
