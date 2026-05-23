import { AddressFields } from '@features/addresses/components/AddressFields';
import type { AddressFieldName } from '@features/addresses/form';
import type { AuthFieldErrors, AuthFormValues } from '@features/auth/form';
import { Field } from '@shared/ui/form/Field';
import { Input } from '@shared/ui/form/Input';
import { PhoneField } from '@shared/ui/form/PhoneField';
import { FirstName, LastName } from '@shared/value-objects/Name';

interface AuthSignUpFieldsProps {
    fieldErrors: AuthFieldErrors;
    onAddressFieldChange: (name: AddressFieldName, value: string) => void;
    onFirstNameBlur: () => void;
    onFirstNameChange: (value: string) => void;
    onLastNameBlur: () => void;
    onLastNameChange: (value: string) => void;
    onPhoneBlur: () => void;
    onPhoneCountryChange: (value: AuthFormValues['phoneCountry']) => void;
    onPhoneNumberChange: (value: string) => void;
    values: AuthFormValues;
}

export function AuthSignUpFields({
    fieldErrors,
    onAddressFieldChange,
    onFirstNameBlur,
    onFirstNameChange,
    onLastNameBlur,
    onLastNameChange,
    onPhoneBlur,
    onPhoneCountryChange,
    onPhoneNumberChange,
    values,
}: AuthSignUpFieldsProps) {
    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                <Field
                    error={fieldErrors.firstName}
                    label="First name"
                    required
                >
                    <Input
                        autoComplete="given-name"
                        hasError={Boolean(fieldErrors.firstName)}
                        maxLength={FirstName.MAX_LENGTH}
                        onBlur={onFirstNameBlur}
                        onChange={(event) => {
                            onFirstNameChange(event.target.value);
                        }}
                        placeholder="Jane"
                        value={values.firstName}
                    />
                </Field>

                <Field error={fieldErrors.lastName} label="Last name" required>
                    <Input
                        autoComplete="family-name"
                        hasError={Boolean(fieldErrors.lastName)}
                        maxLength={LastName.MAX_LENGTH}
                        onBlur={onLastNameBlur}
                        onChange={(event) => {
                            onLastNameChange(event.target.value);
                        }}
                        placeholder="Doe"
                        value={values.lastName}
                    />
                </Field>
            </div>

            <PhoneField
                country={values.phoneCountry}
                error={fieldErrors.phoneNumber}
                label="Phone number"
                onBlur={onPhoneBlur}
                onCountryChange={onPhoneCountryChange}
                onNumberChange={onPhoneNumberChange}
                value={values.phoneNumber}
            />

            <AddressFields
                countryCode={values.phoneCountry}
                errors={fieldErrors}
                onFieldChange={onAddressFieldChange}
                values={values}
            />
        </>
    );
}
