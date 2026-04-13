import {
    PRODUCT_CODE_MAX_LENGTH,
    PRODUCT_MAX_PRICE_CENTS,
    PRODUCT_NAME_MAX_LENGTH,
} from '../formatting/money';
import { backendErrorMessage, resolveBackendError } from '../services/http';
import { collectFieldErrors, hasFieldErrors } from '../validation/forms';
import { MoneyValidator } from '../validation/numbers';
import { StringValidator } from '../validation/strings';
import type { CreateProductInput, Product } from './api';

export interface ProductFormValues {
    code: string;
    name: string;
    price: string;
}

export type ProductFieldName = keyof ProductFormValues;
export type ProductFieldErrors = Partial<Record<ProductFieldName, string>>;

const PRODUCT_NAME_VALIDATOR = new StringValidator({
    fieldName: 'Name',
    required: true,
    maxLength: PRODUCT_NAME_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
});
const PRODUCT_CODE_VALIDATOR = new StringValidator({
    fieldName: 'Code',
    required: true,
    maxLength: PRODUCT_CODE_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
    uppercase: true,
});
const PRODUCT_PRICE_VALIDATOR = new MoneyValidator('Price', {
    maxCents: PRODUCT_MAX_PRICE_CENTS,
});

export function createProductFormValues(): ProductFormValues {
    return {
        code: '',
        name: '',
        price: '',
    };
}

export function toProductFormValues(product: Product): ProductFormValues {
    return {
        code: product.code,
        name: product.name,
        price: formatProductPriceInput(product.priceCents),
    };
}

export function formatProductField<Name extends ProductFieldName>(
    name: Name,
    value: ProductFormValues[Name]
) {
    switch (name) {
        case 'code':
            return PRODUCT_CODE_VALIDATOR.formatInput(
                value
            ) as ProductFormValues[Name];
        case 'name':
            return PRODUCT_NAME_VALIDATOR.formatInput(
                value
            ) as ProductFormValues[Name];
        case 'price':
            return PRODUCT_PRICE_VALIDATOR.formatInput(
                value
            ) as ProductFormValues[Name];
    }
}

export function assessProductForm(values: ProductFormValues) {
    const name = PRODUCT_NAME_VALIDATOR.assess(values.name);
    const code = PRODUCT_CODE_VALIDATOR.assess(values.code);
    const price = PRODUCT_PRICE_VALIDATOR.assess(values.price);
    const fieldErrors = collectFieldErrors<ProductFieldName>({
        code,
        name,
        price,
    });
    const hasErrors = hasFieldErrors(fieldErrors);

    return {
        fieldErrors,
        payload:
            !hasErrors && name.value && code.value && price.value !== null
                ? ({
                      code: code.value,
                      name: name.value,
                      priceCents: price.value,
                  } satisfies CreateProductInput)
                : null,
    };
}

export function toProductErrorState(error: unknown) {
    return resolveBackendError<{
        fieldErrors: ProductFieldErrors;
        formError: string | null;
    }>(
        error,
        {
            PRODUCT_CODE_EXISTS: (backendError) => ({
                fieldErrors: {
                    code: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_CODE_INVALID: (backendError) => ({
                fieldErrors: {
                    code: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_CODE_REQUIRED: (backendError) => ({
                fieldErrors: {
                    code: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_CODE_TOO_LONG: (backendError) => ({
                fieldErrors: {
                    code: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_ID_INVALID: (backendError) => ({
                fieldErrors: {},
                formError: backendErrorMessage(backendError.code),
            }),
            PRODUCT_NAME_INVALID: (backendError) => ({
                fieldErrors: {
                    name: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_NAME_REQUIRED: (backendError) => ({
                fieldErrors: {
                    name: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_NAME_TOO_LONG: (backendError) => ({
                fieldErrors: {
                    name: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_NOT_FOUND: (backendError) => ({
                fieldErrors: {},
                formError: backendErrorMessage(backendError.code),
            }),
            PRODUCT_PRICE_INVALID: (backendError) => ({
                fieldErrors: {
                    price: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            PRODUCT_PRICE_TOO_LARGE: (backendError) => ({
                fieldErrors: {
                    price: backendErrorMessage(backendError.code),
                },
                formError: null,
            }),
            STAFF_ACCOUNT_REQUIRED: (backendError) => ({
                fieldErrors: {},
                formError: backendErrorMessage(backendError.code),
            }),
            STAFF_PERMISSION_REQUIRED: (backendError) => ({
                fieldErrors: {},
                formError: backendErrorMessage(backendError.code),
            }),
        },
        (formError) => ({ fieldErrors: {}, formError })
    );
}

function formatProductPriceInput(priceCents: number) {
    return PRODUCT_PRICE_VALIDATOR.formatInput((priceCents / 100).toFixed(2));
}
