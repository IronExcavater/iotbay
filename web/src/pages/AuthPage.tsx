import {
    useEffect,
    useState,
    type ChangeEvent,
    type SubmitEvent,
} from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { AddressFields } from '../addresses/AddressFields';
import { setAddressField, type AddressFieldName } from '../addresses/form';
import {
    AuthPageLayout,
    authPanelClassName,
} from '../auth/AuthPageLayout';
import { useAuth } from '../auth/AuthProvider';
import {
    toAuthErrorState,
    toRegisterInput,
    type AuthFieldErrors as FieldErrors,
    type AuthFormValues as FormValues,
    validateAuthForm,
} from '../auth/form';
import { PasswordRuleList } from '../auth/PasswordRuleList';
import { getBrowserPhoneCountry, validatePhoneNumber } from '../auth/phone';
import {
    buildForgotPasswordPath,
    buildSignInPath,
    buildSignUpPath,
    resolvePostAuthPath,
} from '../auth/redirects';
import {
    EMAIL_MAX_LENGTH,
    getPasswordRules,
    NAME_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    sanitizeEmail,
    sanitizeFirstName,
    sanitizeLastName,
    sanitizePasswordInput,
    validateEmail,
    validateFirstNameOnBlur,
    validateLastNameOnBlur,
} from '../auth/validation';
import { Button, textButtonClassName } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { PhoneField } from '../components/form/PhoneField';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtml } from '../services/download';

type AuthPageMode = 'signin' | 'signup' | 'staff';
type NameFieldName = 'firstName' | 'lastName';
type PasswordFieldName = 'confirmPassword' | 'password';

type AuthModeConfig = {
    defaultNextPath: string;
    passwordAutoComplete: string;
    passwordPlaceholder: string;
    submitLabel: string;
    switchLink: {
        label: string;
        to: string;
    };
    title: string;
    userType?: 'staff';
};

type NameFieldConfig = {
    autoComplete: string;
    label: string;
    name: NameFieldName;
    placeholder: string;
    sanitize: (value: string) => string;
    validate: (value: string) => string | null | undefined;
};

const AUTH_MODE_CONFIG: Record<AuthPageMode, AuthModeConfig> = {
    signin: {
        defaultNextPath: '/',
        passwordAutoComplete: 'current-password',
        passwordPlaceholder: 'Enter your password',
        submitLabel: 'Sign in',
        switchLink: {
            label: "Don't have an account? Sign up",
            to: buildSignUpPath(),
        },
        title: 'Sign in',
    },
    signup: {
        defaultNextPath: '/',
        passwordAutoComplete: 'new-password',
        passwordPlaceholder: 'Choose a password',
        submitLabel: 'Create account',
        switchLink: {
            label: 'Have an account? Sign in',
            to: buildSignInPath(),
        },
        title: 'Sign up',
    },
    staff: {
        defaultNextPath: '/admin',
        passwordAutoComplete: 'current-password',
        passwordPlaceholder: 'Enter your password',
        submitLabel: 'Sign in',
        switchLink: {
            label: 'Not staff? Sign in here',
            to: buildSignInPath(),
        },
        title: 'Staff sign in',
        userType: 'staff',
    },
};

const DEFAULT_PASSWORD_VISIBILITY: Record<PasswordFieldName, boolean> = {
    confirmPassword: false,
    password: false,
};

const SIGN_UP_NAME_FIELDS: readonly NameFieldConfig[] = [
    {
        autoComplete: 'given-name',
        label: 'First name',
        name: 'firstName',
        placeholder: 'Jane',
        sanitize: sanitizeFirstName,
        validate: validateFirstNameOnBlur,
    },
    {
        autoComplete: 'family-name',
        label: 'Last name',
        name: 'lastName',
        placeholder: 'Doe',
        sanitize: sanitizeLastName,
        validate: validateLastNameOnBlur,
    },
];

function createDefaultValues(overrides: Partial<FormValues> = {}): FormValues {
    return {
        addressLineOne: '',
        addressLineTwo: '',
        country: '',
        confirmPassword: '',
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        phoneCountry: getBrowserPhoneCountry(),
        phoneNumber: '',
        postcode: '',
        state: '',
        suburb: '',
        ...overrides,
    };
}

export default function AuthPage({ mode = 'signin' }: { mode?: AuthPageMode }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, register } = useAuth();
    const { showToast } = useToast();
    const [values, setValues] = useState<FormValues>(() => createDefaultValues());
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [passwordVisibility, setPasswordVisibility] = useState(
        DEFAULT_PASSWORD_VISIBILITY
    );

    const modeConfig = AUTH_MODE_CONFIG[mode];
    const isSignUp = mode === 'signup';
    const prefilledEmail = searchParams.get('email')?.trim() ?? '';
    const nextPath =
        searchParams.get('next')?.trim() || modeConfig.defaultNextPath;
    const forgotPasswordPath = buildForgotPasswordPath({
        email: values.email,
        userType: modeConfig.userType,
    });
    const passwordRules = getPasswordRules(values.password, {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
    });
    const validationOptions = {
        isSignUp,
        passwordRulesMet: passwordRules.every((rule) => rule.met),
    };

    useEffect(() => {
        setFieldErrors({});
        setFormError(null);
        setValues((current) =>
            createDefaultValues({ email: prefilledEmail || current.email })
        );
        setPasswordVisibility(DEFAULT_PASSWORD_VISIBILITY);

        if (typeof location.state?.successMessage !== 'string') {
            return;
        }

        showToast(location.state.successMessage);
        navigate(location.pathname + location.search, {
            replace: true,
            state: null,
        });
    }, [
        location.pathname,
        location.search,
        location.state,
        navigate,
        prefilledEmail,
        showToast,
    ]);

    function getValidationErrors(nextValues: FormValues = values) {
        return validateAuthForm(nextValues, validationOptions);
    }

    function setFieldError(name: keyof FieldErrors, error?: string | null) {
        setFieldErrors((current) => ({
            ...current,
            [name]: error || undefined,
        }));
    }

    function patchValues(patch: Partial<FormValues>) {
        setValues((current) => ({
            ...current,
            ...patch,
        }));
    }

    function togglePasswordVisibility(name: PasswordFieldName) {
        setPasswordVisibility((current) => ({
            ...current,
            [name]: !current[name],
        }));
    }

    function resetForm() {
        setFieldErrors({});
        setFormError(null);
        setValues(createDefaultValues());
        setPasswordVisibility(DEFAULT_PASSWORD_VISIBILITY);
    }

    function syncConfirmPasswordError(
        confirmPassword: string,
        password: string
    ) {
        setFieldError(
            'confirmPassword',
            getConfirmPasswordError(confirmPassword, password)
        );
    }

    function handleNameChange(
        field: Pick<NameFieldConfig, 'name' | 'sanitize'>,
        event: ChangeEvent<HTMLInputElement>
    ) {
        patchValues({
            [field.name]: field.sanitize(event.target.value),
        });
    }

    function handleNameBlur(
        field: Pick<NameFieldConfig, 'name' | 'validate'>
    ) {
        setFieldError(field.name, field.validate(values[field.name]));
    }

    function handleEmailBlur() {
        setFieldError('email', validateEmail(values.email));
    }

    function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
        patchValues({
            email: sanitizeEmail(event.target.value),
        });
    }

    function handlePhoneBlur() {
        setFieldError(
            'phoneNumber',
            values.phoneNumber.trim()
                ? validatePhoneNumber(values.phoneNumber, values.phoneCountry)
                : null
        );
    }

    function handlePhoneCountryChange(phoneCountry: FormValues['phoneCountry']) {
        patchValues({ phoneCountry });
    }

    function handlePhoneNumberChange(phoneNumber: string) {
        patchValues({ phoneNumber });
    }

    function handleAddressFieldChange(name: AddressFieldName, value: string) {
        setValues((current) => setAddressField(current, name, value));
    }

    function handlePasswordBlur() {
        if (!isSignUp || !values.password) {
            return;
        }

        setFieldError('password', getValidationErrors().password);
    }

    function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
        const password = sanitizePasswordInput(event.target.value);
        patchValues({ password });

        if (isSignUp && values.confirmPassword) {
            syncConfirmPasswordError(values.confirmPassword, password);
        }
    }

    function handleConfirmPasswordBlur() {
        syncConfirmPasswordError(values.confirmPassword, values.password);
    }

    function handleConfirmPasswordChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const confirmPassword = sanitizePasswordInput(event.target.value);
        patchValues({ confirmPassword });
        syncConfirmPasswordError(confirmPassword, values.password);
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        const nextFieldErrors = getValidationErrors();
        setFieldErrors(nextFieldErrors);
        if (Object.values(nextFieldErrors).some(Boolean)) {
            setFormError('Check the highlighted fields');
            return;
        }

        setFormError(null);
        setIsSubmitting(true);

        try {
            if (isSignUp) {
                const result = await register(toRegisterInput(values));
                downloadHtml(result.download);
                resetForm();
                navigate(buildSignupVerificationPath(result));
                return;
            }

            const authenticatedUser = await login({
                email: values.email.trim(),
                password: values.password,
                userType: modeConfig.userType,
            });
            navigate(resolvePostAuthPath(authenticatedUser, nextPath));
        } catch (error) {
            const nextErrorState = toAuthErrorState(error, isSignUp);
            setFieldErrors(nextErrorState.fieldErrors);
            setFormError(nextErrorState.formError);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <AuthPageLayout title={modeConfig.title}>
            <form
                className={authPanelClassName}
                noValidate
                onSubmit={handleSubmit}
            >
                {formError ? (
                    <FormNotice tone="error">{formError}</FormNotice>
                ) : null}

                {isSignUp ? (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                            {SIGN_UP_NAME_FIELDS.map((field) => (
                                <Field
                                    error={fieldErrors[field.name]}
                                    key={field.name}
                                    label={field.label}
                                    required
                                >
                                    <input
                                        autoComplete={field.autoComplete}
                                        className={inputClassName(
                                            Boolean(fieldErrors[field.name])
                                        )}
                                        maxLength={NAME_MAX_LENGTH}
                                        onBlur={() => {
                                            handleNameBlur(field);
                                        }}
                                        onChange={(event) => {
                                            handleNameChange(field, event);
                                        }}
                                        placeholder={field.placeholder}
                                        value={values[field.name]}
                                    />
                                </Field>
                            ))}
                        </div>

                        <PhoneField
                            country={values.phoneCountry}
                            error={fieldErrors.phoneNumber}
                            label="Phone number"
                            onBlur={handlePhoneBlur}
                            onCountryChange={handlePhoneCountryChange}
                            onNumberChange={handlePhoneNumberChange}
                            value={values.phoneNumber}
                        />

                        <AddressFields
                            countryCode={values.phoneCountry}
                            errors={fieldErrors}
                            onFieldChange={handleAddressFieldChange}
                            values={values}
                        />
                    </>
                ) : null}

                <Field error={fieldErrors.email} label="Email" required>
                    <input
                        autoComplete="email"
                        className={inputClassName(Boolean(fieldErrors.email))}
                        maxLength={EMAIL_MAX_LENGTH}
                        onBlur={handleEmailBlur}
                        onChange={handleEmailChange}
                        placeholder="jane.doe@email.com"
                        type="email"
                        value={values.email}
                    />
                </Field>

                <Field error={fieldErrors.password} label="Password" required>
                    <PasswordInput
                        autoComplete={modeConfig.passwordAutoComplete}
                        hasError={Boolean(fieldErrors.password)}
                        maxLength={PASSWORD_MAX_LENGTH}
                        name="password"
                        onBlur={handlePasswordBlur}
                        onChange={handlePasswordChange}
                        onToggle={() => {
                            togglePasswordVisibility('password');
                        }}
                        placeholder={modeConfig.passwordPlaceholder}
                        showPassword={passwordVisibility.password}
                        value={values.password}
                    />
                    {isSignUp ? (
                        <PasswordRuleList rules={passwordRules} />
                    ) : null}
                </Field>

                {isSignUp ? (
                    <Field
                        error={fieldErrors.confirmPassword}
                        label="Confirm password"
                        required
                    >
                        <PasswordInput
                            autoComplete="new-password"
                            hasError={Boolean(fieldErrors.confirmPassword)}
                            maxLength={PASSWORD_MAX_LENGTH}
                            name="confirmPassword"
                            onBlur={handleConfirmPasswordBlur}
                            onChange={handleConfirmPasswordChange}
                            onToggle={() => {
                                togglePasswordVisibility('confirmPassword');
                            }}
                            placeholder="Re-enter your password"
                            showPassword={passwordVisibility.confirmPassword}
                            value={values.confirmPassword}
                        />
                    </Field>
                ) : (
                    <Link className={textButtonClassName} to={forgotPasswordPath}>
                        Forgot password
                    </Link>
                )}

                <Button
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    type="submit"
                    variant="primary"
                >
                    {modeConfig.submitLabel}
                </Button>

                <Link
                    className={textButtonClassName}
                    to={modeConfig.switchLink.to}
                >
                    {modeConfig.switchLink.label}
                </Link>
            </form>
        </AuthPageLayout>
    );
}

function getConfirmPasswordError(
    confirmPassword: string,
    password: string
): string | undefined {
    if (!confirmPassword) {
        return 'Confirm password is required';
    }

    return confirmPassword !== password ? 'Passwords do not match' : undefined;
}

function buildSignupVerificationPath(result: {
    download?: { filename: string; html: string };
    verification: { email: string };
}) {
    // Local development may return the verification email as a downloadable
    // HTML artifact, so carry that state forward to the verify screen.
    const query = new URLSearchParams({
        context: 'signup',
        email: result.verification.email,
    });
    if (result.download) {
        query.set('downloaded', '1');
    }
    return `/verify-email?${query.toString()}`;
}
