import { hasSelectedAddress, validateAddressField } from '../auth/validation';

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
    if (!hasSelectedAddress(values)) {
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
            validateAddressField(
                values.addressLineOne,
                'Address line 1',
                true
            ) || undefined,
        country:
            validateAddressField(values.country, 'Country', true) || undefined,
        postcode:
            validateAddressField(values.postcode, 'Postcode', true) ||
            undefined,
        state: validateAddressField(values.state, 'State', true) || undefined,
        suburb:
            validateAddressField(values.suburb, 'Suburb', true) || undefined,
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
