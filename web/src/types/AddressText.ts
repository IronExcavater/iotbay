import { ADDRESS_MAX_LENGTH } from '../validation/strings';
import { AddressValidator } from '../validation/textual';

export class AddressText {
    static readonly MAX_LENGTH = ADDRESS_MAX_LENGTH;

    constructor(readonly value: string) {}

    static assess(value: string, fieldName: string, required = false) {
        return new AddressValidator({
            fieldName,
            maxLength: ADDRESS_MAX_LENGTH,
            asciiOnly: true,
            printableAsciiOnly: true,
            required,
        }).assess(value);
    }

    static formatInput(value: string, fieldName: string) {
        return new AddressValidator({
            fieldName,
            maxLength: ADDRESS_MAX_LENGTH,
            asciiOnly: true,
            printableAsciiOnly: true,
        }).formatInput(value);
    }

    static validate(value: string, fieldName: string, required = false) {
        return this.assess(value, fieldName, required).error;
    }

    static hasSelectedAddress(value: {
        addressLineOne?: string;
        addressLineTwo: string;
        country?: string;
        postcode?: string;
        state?: string;
        suburb?: string;
    }) {
        return Boolean(
            value.addressLineOne?.trim() ||
            value.addressLineTwo.trim() ||
            value.suburb?.trim() ||
            value.state?.trim() ||
            value.postcode?.trim() ||
            value.country?.trim()
        );
    }
}
