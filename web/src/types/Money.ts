import type { ValidationResult } from '../validation/base';
import { MoneyValidator } from '../validation/numbers';
import { parseValue } from './base';

const MAX_CENTS = 100_000_000;
const MONEY_VALIDATOR = new MoneyValidator('Price', { maxCents: MAX_CENTS });

export class Money {
    static readonly MAX_CENTS = MAX_CENTS;

    constructor(readonly cents: number) {}

    /** Format cents as an AUD string for display (e.g. A$10.00) */
    static format(cents: number): string {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(cents / 100);
    }

    /** Sanitize raw user input during typing */
    static formatInput(value: string): string {
        return MONEY_VALIDATOR.formatInput(value);
    }

    /** Compute the correct caret position after input is sanitized */
    static caretPosition(value: string, selectionStart: number): number {
        return MONEY_VALIDATOR.caretPosition(value, selectionStart);
    }

    /** Validate a user-typed dollar string and return cents, or an error */
    static assess(value: string): ValidationResult<string, number> {
        return MONEY_VALIDATOR.assess(value);
    }

    static parse(value: string) {
        return parseValue(this, value, (cents) => new Money(cents));
    }

    /** Convert stored cents to an editable input string */
    static toInput(cents: number): string {
        return MONEY_VALIDATOR.formatInput((cents / 100).toFixed(2));
    }
}
