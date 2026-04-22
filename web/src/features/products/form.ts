import type { CreateProductInput, Product } from '@features/products/api';
import {
    backendErrorMessage,
    resolveBackendError,
} from '@shared/services/http';
import { collectFieldErrors, hasFieldErrors } from '@shared/validation/forms';
import { Money } from '@shared/value-objects/Money';
import { ProductCode, ProductName } from '@shared/value-objects/ProductText';

export interface ProductFormValues {
    code: string;
    name: string;
    price: string;
}

export type ProductFieldName = keyof ProductFormValues;
export type ProductFieldErrors = Partial<Record<ProductFieldName, string>>;

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
        price: Money.toInput(product.priceCents),
    };
}

export function assessProductForm(values: ProductFormValues) {
    const name = ProductName.assess(values.name);
    const code = ProductCode.assess(values.code);
    const price = Money.assess(values.price);
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
