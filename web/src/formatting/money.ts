export const PRODUCT_CODE_MAX_LENGTH = 32;
export const PRODUCT_MAX_PRICE_CENTS = 100_000_000;
export const PRODUCT_NAME_MAX_LENGTH = 120;

export function formatAud(valueInCents: number, locale = 'en-AU') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'AUD',
    }).format(valueInCents / 100);
}
