export const PRODUCT_TYPE_OPTIONS = [
    { label: 'Sensor', value: 'Sensor' },
    { label: 'Actuator', value: 'Actuator' },
    { label: 'Gateway', value: 'Gateway' },
    { label: 'Controller', value: 'Controller' },
] as const;

export type ProductType = (typeof PRODUCT_TYPE_OPTIONS)[number]['value'];
export const DEFAULT_PRODUCT_TYPE: ProductType = 'Sensor';

export function isProductType(value: string): value is ProductType {
    return PRODUCT_TYPE_OPTIONS.some((option) => option.value === value);
}

export function normalizeProductType(value: string): ProductType {
    return isProductType(value) ? value : DEFAULT_PRODUCT_TYPE;
}
