import { StringValidator } from '../validation/strings';

const PRODUCT_CODE_MAX_LENGTH = 32;
const PRODUCT_NAME_MAX_LENGTH = 120;

const PRODUCT_NAME_VALIDATOR = new StringValidator({
    fieldName: 'Name',
    required: true,
    maxLength: PRODUCT_NAME_MAX_LENGTH,
});
const PRODUCT_CODE_VALIDATOR = new StringValidator({
    fieldName: 'Code',
    required: true,
    maxLength: PRODUCT_CODE_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
    uppercase: true,
});

export class ProductName {
    static readonly MAX_LENGTH = PRODUCT_NAME_MAX_LENGTH;

    constructor(readonly value: string) {}

    static assess(value: string) {
        return PRODUCT_NAME_VALIDATOR.assess(value);
    }

    static formatInput(value: string) {
        return PRODUCT_NAME_VALIDATOR.formatInput(value);
    }
}

export class ProductCode {
    static readonly MAX_LENGTH = PRODUCT_CODE_MAX_LENGTH;

    constructor(readonly value: string) {}

    static assess(value: string) {
        return PRODUCT_CODE_VALIDATOR.assess(value);
    }

    static formatInput(value: string) {
        return PRODUCT_CODE_VALIDATOR.formatInput(value);
    }
}
