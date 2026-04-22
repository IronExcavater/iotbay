import clsx from 'clsx';

import { AddressFields } from '../../addresses/AddressFields';
import type { AddressFieldName } from '../../addresses/form';
import { Button } from '../../components/form/Button';
import { Field } from '../../components/form/Field';
import { Input } from '../../components/form/Input';
import { PasswordInput } from '../../components/form/PasswordInput';
import { PhoneField } from '../../components/form/PhoneField';
import { Email } from '../../types/Email';
import { FirstName, LastName } from '../../types/Name';
import { Password } from '../../types/Password';
import { Designation, StaffId } from '../../types/Staff';
import type { ProfileValues } from '../types';

type FieldErrors = Partial<Record<keyof ProfileValues, string>>;

export function AccountPersonalSection({
    fieldErrors,
    onEmailBlur,
    onEmailChange,
    onFirstNameBlur,
    onFirstNameChange,
    onLastNameBlur,
    onLastNameChange,
    values,
}: {
    fieldErrors: FieldErrors;
    onEmailBlur: () => void;
    onEmailChange: (value: string) => void;
    onFirstNameBlur: () => void;
    onFirstNameChange: (value: string) => void;
    onLastNameBlur: () => void;
    onLastNameChange: (value: string) => void;
    values: ProfileValues;
}) {
    return (
        <section className="grid gap-4">
            <h3 className="text-ui-700 text-sm font-semibold tracking-[0.08em] uppercase">
                Personal
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                    error={fieldErrors.firstName}
                    label="First name"
                    required
                >
                    <Input
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

            <Field error={fieldErrors.email} label="Email" required>
                <Input
                    hasError={Boolean(fieldErrors.email)}
                    maxLength={Email.MAX_LENGTH}
                    onBlur={onEmailBlur}
                    onChange={(event) => {
                        onEmailChange(event.target.value);
                    }}
                    placeholder="jane.doe@email.com"
                    type="email"
                    value={values.email}
                />
            </Field>
        </section>
    );
}

export function AccountContactSection({
    errors,
    onAddressFieldChange,
    onPhoneBlur,
    onPhoneCountryChange,
    onPhoneNumberChange,
    values,
}: {
    errors: FieldErrors;
    onAddressFieldChange: (name: AddressFieldName, value: string) => void;
    onPhoneBlur: () => void;
    onPhoneCountryChange: (value: ProfileValues['phoneCountry']) => void;
    onPhoneNumberChange: (value: string) => void;
    values: ProfileValues;
}) {
    return (
        <section className="border-ui-200 grid gap-4 border-t pt-6">
            <h3 className="text-ui-700 text-sm font-semibold tracking-[0.08em] uppercase">
                Contact
            </h3>
            <PhoneField
                country={values.phoneCountry}
                error={errors.phoneNumber}
                label="Phone number"
                onBlur={onPhoneBlur}
                onCountryChange={onPhoneCountryChange}
                onNumberChange={onPhoneNumberChange}
                value={values.phoneNumber}
            />

            <AddressFields
                countryCode={values.phoneCountry}
                errors={errors}
                onFieldChange={onAddressFieldChange}
                values={values}
            />
        </section>
    );
}

export function AccountStaffSection({
    errors,
    onDesignationChange,
    onStaffIdChange,
    values,
}: {
    errors: FieldErrors;
    onDesignationChange: (value: string) => void;
    onStaffIdChange: (value: string) => void;
    values: ProfileValues;
}) {
    return (
        <section className="border-ui-200 grid gap-4 border-t pt-6">
            <h3 className="text-ui-700 text-sm font-semibold tracking-[0.08em] uppercase">
                Staff
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field error={errors.staffId} label="Staff ID">
                    <Input
                        hasError={Boolean(errors.staffId)}
                        maxLength={StaffId.MAX_LENGTH}
                        onChange={(event) => {
                            onStaffIdChange(event.target.value);
                        }}
                        placeholder="STF-001"
                        value={values.staffId}
                    />
                </Field>

                <Field error={errors.designation} label="Position">
                    <Input
                        hasError={Boolean(errors.designation)}
                        maxLength={Designation.MAX_LENGTH}
                        onChange={(event) => {
                            onDesignationChange(event.target.value);
                        }}
                        placeholder="Store manager"
                        value={values.designation}
                    />
                </Field>

                <Field error={errors.permission} label="Permission">
                    <Input disabled value={values.permission || 'Admin'} />
                </Field>
            </div>
        </section>
    );
}

export function AccountActionsSection({
    currentPasswordHint,
    error,
    hasChanges,
    isSubmitting,
    onBlur,
    onChange,
    onSubmitToggle,
    showPassword,
    value,
}: {
    currentPasswordHint: string;
    error?: string;
    hasChanges: boolean;
    isSubmitting: boolean;
    onBlur: () => void;
    onChange: (value: string) => void;
    onSubmitToggle: () => void;
    showPassword: boolean;
    value: string;
}) {
    return (
        <section
            className={clsx(
                'border-ui-200 border-t pt-6',
                hasChanges
                    ? 'grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start'
                    : 'flex justify-end'
            )}
        >
            {hasChanges ? (
                <Field
                    error={error}
                    hint={currentPasswordHint}
                    label="Password"
                    metaPlacement="inline"
                    required
                >
                    <PasswordInput
                        autoComplete="current-password"
                        hasError={Boolean(error)}
                        name="currentPassword"
                        onBlur={onBlur}
                        onChange={(event) => {
                            onChange(Password.formatInput(event.target.value));
                        }}
                        onToggle={onSubmitToggle}
                        placeholder="Enter your password"
                        showPassword={showPassword}
                        value={value}
                    />
                </Field>
            ) : null}

            <div className={clsx(hasChanges && 'sm:pt-6')}>
                <Button
                    disabled={isSubmitting || !hasChanges}
                    loading={isSubmitting}
                    type="submit"
                    variant="primary"
                >
                    Save changes
                </Button>
            </div>
        </section>
    );
}
