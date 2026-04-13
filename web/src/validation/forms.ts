import type { ValidationResult } from './base';

export type FieldErrors<TFieldName extends string> = Partial<
    Record<TFieldName, string>
>;

export function collectFieldErrors<TFieldName extends string>(
    fields: Partial<
        Record<
            TFieldName,
            | ValidationResult<unknown, unknown>
            | string
            | null
            | undefined
            | false
        >
    >
): FieldErrors<TFieldName> {
    const fieldErrors: FieldErrors<TFieldName> = {};

    for (const [fieldName, value] of Object.entries(fields)) {
        if (!value) {
            continue;
        }

        fieldErrors[fieldName as TFieldName] =
            typeof value === 'string'
                ? value
                : ((value as ValidationResult<unknown, unknown>).error ??
                  undefined);
    }

    return fieldErrors;
}

export function hasFieldErrors<TFieldName extends string>(
    fieldErrors: FieldErrors<TFieldName>
) {
    return Object.values(fieldErrors).some(Boolean);
}
