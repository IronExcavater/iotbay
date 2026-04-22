import type { CountryCode } from 'libphonenumber-js';

export interface ProfileValues {
    addressLineOne: string;
    addressLineTwo: string;
    country: string;
    currentPassword: string;
    designation: string;
    email: string;
    firstName: string;
    lastName: string;
    postcode: string;
    permission: string;
    phoneCountry: CountryCode;
    phoneNumber: string;
    staffId: string;
    state: string;
    suburb: string;
}
