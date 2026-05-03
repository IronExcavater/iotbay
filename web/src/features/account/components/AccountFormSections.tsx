import clsx from 'clsx';
import { FaPen, FaXmark } from 'react-icons/fa6';

import type { ProfileValues } from '@features/account/types';
import { AddressFields } from '@features/addresses/AddressFields';
import type { AddressFieldName } from '@features/addresses/form';
import {
    compressImageToDataUrl,
    isSupportedImage,
} from '@shared/services/media';
import { Avatar } from '@shared/ui/Avatar';
import { Button } from '@shared/ui/form/Button';
import { Field } from '@shared/ui/form/Field';
import { Input } from '@shared/ui/form/Input';
import { PasswordInput } from '@shared/ui/form/PasswordInput';
import { PhoneField } from '@shared/ui/form/PhoneField';
import { Email } from '@shared/value-objects/Email';
import { FirstName, LastName } from '@shared/value-objects/Name';
import { Password } from '@shared/value-objects/Password';
import { Designation, StaffId } from '@shared/value-objects/Staff';

type FieldErrors = Partial<Record<keyof ProfileValues, string>>;

export function AccountPersonalSection({
    fieldErrors,
    onEmailBlur,
    onEmailChange,
    onFirstNameBlur,
    onFirstNameChange,
    onLastNameBlur,
    onLastNameChange,
    onProfileImageChange,
    values,
}: {
    fieldErrors: FieldErrors;
    onEmailBlur: () => void;
    onEmailChange: (value: string) => void;
    onFirstNameBlur: () => void;
    onFirstNameChange: (value: string) => void;
    onLastNameBlur: () => void;
    onLastNameChange: (value: string) => void;
    onProfileImageChange: (value: string) => void;
    values: ProfileValues;
}) {
    const fullName = `${values.firstName} ${values.lastName}`.trim();

    return (
        <section className="grid gap-4">
            <h3 className="text-ui-700 text-sm font-semibold tracking-[0.08em] uppercase">
                Personal
            </h3>
            <div className="grid grid-cols-[auto_1fr] items-start gap-4">
                <div className="relative inline-flex">
                    <label className="group relative inline-flex cursor-pointer rounded-full">
                        <Avatar
                            imageUrl={values.profileImageUrl}
                            name={fullName}
                            size="lg"
                        />
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <FaPen
                                aria-hidden="true"
                                className="size-4 text-white"
                            />
                        </span>
                        <input
                            accept="image/*"
                            aria-label="Change profile photo"
                            className="sr-only"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                if (!file || !isSupportedImage(file)) return;
                                void compressImageToDataUrl(file).then(
                                    onProfileImageChange
                                );
                            }}
                            type="file"
                        />
                    </label>
                    {values.profileImageUrl && (
                        <button
                            aria-label="Remove profile photo"
                            className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-white ring-2 ring-white hover:bg-red-600"
                            onClick={() => onProfileImageChange('')}
                            type="button"
                        >
                            <FaXmark aria-hidden="true" className="size-2.5" />
                        </button>
                    )}
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
            </div>

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
        <section className="grid gap-4">
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
        <section className="grid gap-4">
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
    requiresPassword,
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
    requiresPassword: boolean;
    showPassword: boolean;
    value: string;
}) {
    return (
        <section
            className={clsx(
                requiresPassword
                    ? 'grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start'
                    : 'flex justify-end'
            )}
        >
            {requiresPassword && (
                <Field
                    error={error}
                    hint={currentPasswordHint}
                    label="Your password"
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
            )}

            <div className={clsx(requiresPassword && 'sm:pt-6')}>
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
