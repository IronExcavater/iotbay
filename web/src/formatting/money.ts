import { MoneyValidator } from '../validation/numbers';

export const PRODUCT_CODE_MAX_LENGTH = 32;
export const PRODUCT_MAX_PRICE_CENTS = 100_000_000;
export const PRODUCT_NAME_MAX_LENGTH = 120;

const AUD_MONEY_VALIDATOR = new MoneyValidator('Price', {
    maxCents: PRODUCT_MAX_PRICE_CENTS,
});

export function formatAud(valueInCents: number, locale = 'en-AU') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'AUD',
    }).format(valueInCents / 100);
}

export function formatAudInput(value: string) {
    return AUD_MONEY_VALIDATOR.formatInput(value);
}

export function parseAudInput(value: string) {
    const result = AUD_MONEY_VALIDATOR.tryValidate(value);
    return {
        cents: result.value,
        error: result.error?.message ?? null,
    };
}
