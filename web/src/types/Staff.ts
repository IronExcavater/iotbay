import {
    STAFF_DESIGNATION_MAX_LENGTH,
    STAFF_ID_MAX_LENGTH,
    StringValidator,
} from '../validation/strings';
import { ChoiceValidator } from '../validation/textual';

const STAFF_ID_VALIDATOR = new StringValidator({
    fieldName: 'Staff ID',
    required: true,
    maxLength: STAFF_ID_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
    uppercase: true,
});
const OPTIONAL_STAFF_ID_VALIDATOR = new StringValidator({
    fieldName: 'Staff ID',
    maxLength: STAFF_ID_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
    uppercase: true,
});
const DESIGNATION_VALIDATOR = new StringValidator({
    fieldName: 'Position',
    required: true,
    maxLength: STAFF_DESIGNATION_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
});
const OPTIONAL_DESIGNATION_VALIDATOR = new StringValidator({
    fieldName: 'Position',
    maxLength: STAFF_DESIGNATION_MAX_LENGTH,
    asciiOnly: true,
    printableAsciiOnly: true,
});
const OPTIONAL_PERMISSION_VALIDATOR = new ChoiceValidator(
    { fieldName: 'Permission' },
    ['admin', 'superadmin']
);
const REQUIRED_PERMISSION_VALIDATOR = new ChoiceValidator(
    { fieldName: 'Permission', required: true },
    ['admin', 'superadmin']
);

export class StaffId {
    static readonly MAX_LENGTH = STAFF_ID_MAX_LENGTH;

    constructor(readonly value: string) {}

    static assess(value: string, required = true) {
        return (
            required ? STAFF_ID_VALIDATOR : OPTIONAL_STAFF_ID_VALIDATOR
        ).assess(value);
    }

    static formatInput(value: string) {
        return OPTIONAL_STAFF_ID_VALIDATOR.formatInput(value);
    }
}

export class Designation {
    static readonly MAX_LENGTH = STAFF_DESIGNATION_MAX_LENGTH;

    constructor(readonly value: string) {}

    static assess(value: string, required = true) {
        return (
            required ? DESIGNATION_VALIDATOR : OPTIONAL_DESIGNATION_VALIDATOR
        ).assess(value);
    }

    static formatInput(value: string) {
        return OPTIONAL_DESIGNATION_VALIDATOR.formatInput(value);
    }
}

export class Permission {
    constructor(readonly value: 'admin' | 'superadmin') {}

    static assess(value: string, required = false) {
        return (
            required
                ? REQUIRED_PERMISSION_VALIDATOR
                : OPTIONAL_PERMISSION_VALIDATOR
        ).assess(value);
    }
}
