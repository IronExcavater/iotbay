import { AddressText } from '@shared/value-objects/AddressText';

export interface AddressFormValues {
    addressLineOne: string;
    addressLineTwo: string;
    country: string;
    postcode: string;
    state: string;
    suburb: string;
}

export type AddressFieldName =
    | 'addressLineOne'
    | 'addressLineTwo'
    | 'suburb'
    | 'state'
    | 'postcode'
    | 'country';

export interface AddressFieldErrors {
    addressLineOne?: string;
    country?: string;
    postcode?: string;
    state?: string;
    suburb?: string;
}

export function setAddressField<TValues extends AddressFormValues>(
    values: TValues,
    name: AddressFieldName,
    value: string
): TValues {
    return {
        ...values,
        [name]: value,
    };
}

export function validateAddressValues(
    values: AddressFormValues,
    required = false
): AddressFieldErrors {
    if (!AddressText.hasSelectedAddress(values)) {
        if (!required) {
            return {};
        }
        return {
            addressLineOne: 'Address line 1 is required',
            suburb: 'Suburb is required',
            state: 'State is required',
            postcode: 'Postcode is required',
            country: 'Country is required',
        };
    }

    const fieldErrors: AddressFieldErrors = {
        addressLineOne:
            AddressText.validate(
                values.addressLineOne,
                'Address line 1',
                true
            ) || undefined,
        country:
            AddressText.validate(values.country, 'Country', true) || undefined,
        postcode:
            AddressText.validate(values.postcode, 'Postcode', true) ||
            undefined,
        state: AddressText.validate(values.state, 'State', true) || undefined,
        suburb:
            AddressText.validate(values.suburb, 'Suburb', true) || undefined,
    };

    return fieldErrors;
}

export function toAddressInput(values: AddressFormValues) {
    return {
        addressLineOne: values.addressLineOne.trim(),
        addressLineTwo: values.addressLineTwo.trim(),
        country: values.country.trim(),
        postcode: values.postcode.trim(),
        state: values.state.trim(),
        suburb: values.suburb.trim(),
    };
}
