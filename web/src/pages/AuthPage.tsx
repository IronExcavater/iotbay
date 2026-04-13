import { useEffect, useState, type ChangeEvent, type SubmitEvent } from 'react';
import {
    Link,
    useLocation,
    useNavigate,
    useSearchParams,
} from 'react-router-dom';

import { AddressFields } from '../addresses/AddressFields';
import { setAddressField, type AddressFieldName } from '../addresses/form';
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
    buildVerifyEmailPath,
    buildForgotPasswordPath,
    buildSignInPath,
    buildSignUpPath,
    normalizeNextPath,
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
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtml } from '../services/download';

type AuthPageMode = 'signin' | 'signup' | 'staff';

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
    const [values, setValues] = useState<FormValues>(() =>
        createDefaultValues()
    );
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const isSignUp = mode === 'signup';
    const isStaff = mode === 'staff';
    const prefilledEmail = searchParams.get('email')?.trim() ?? '';
    const nextPath = normalizeNextPath(
        searchParams.get('next'),
        isStaff ? '/admin' : '/'
    );
    const passwordRules = getPasswordRules(values.password, {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
    });
    const passwordRulesMet = passwordRules.every((rule) => rule.met);
    const passwordAutoComplete = isSignUp ? 'new-password' : 'current-password';
    const passwordPlaceholder = isSignUp
        ? 'Choose a password'
        : 'Enter your password';
    const pageCopy = getAuthPageCopy(mode, nextPath);
    const forgotPasswordPath = buildForgotPasswordPath({
        email: values.email,
        nextPath,
        userType: isStaff ? 'staff' : undefined,
    });

    useEffect(() => {
        // Route changes can carry a success message or a prefilled email.
        // Reset the transient form state, but keep any forwarded email.
        setFieldErrors({});
        setFormError(null);
        setIsSubmitting(false);
        setValues((current) =>
            createDefaultValues({ email: prefilledEmail || current.email })
        );
        setShowPassword(false);
        setShowConfirmPassword(false);

        if (typeof location.state?.successMessage !== 'string') return;

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

    function updateValues(patch: Partial<FormValues>) {
        setValues((current) => ({
            ...current,
            ...patch,
        }));
    }

    function resetForm() {
        setFieldErrors({});
        setFormError(null);
        setValues(createDefaultValues());
        setShowPassword(false);
        setShowConfirmPassword(false);
    }

    function setFieldError(name: keyof FieldErrors, error?: string | null) {
        setFieldErrors((current) => ({
            ...current,
            [name]: error || undefined,
        }));
    }

    function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
        updateValues({
            email: sanitizeEmail(event.target.value),
        });
    }

    function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
        const password = sanitizePasswordInput(event.target.value);
        updateValues({ password });

        if (!isSignUp || !values.confirmPassword) return;

        setFieldError(
            'confirmPassword',
            getConfirmPasswordError(values.confirmPassword, password)
        );
    }

    function handleConfirmPasswordChange(event: ChangeEvent<HTMLInputElement>) {
        const confirmPassword = sanitizePasswordInput(event.target.value);
        updateValues({ confirmPassword });
        setFieldError(
            'confirmPassword',
            getConfirmPasswordError(confirmPassword, values.password)
        );
    }

    function handleAddressFieldChange(name: AddressFieldName, value: string) {
        setValues((current) => setAddressField(current, name, value));
    }

    function handlePhoneBlur() {
        setFieldError(
            'phoneNumber',
            values.phoneNumber.trim()
                ? validatePhoneNumber(values.phoneNumber, values.phoneCountry)
                : null
        );
    }

    function validateCurrentForm() {
        return validateAuthForm(values, {
            isSignUp,
            passwordRulesMet,
        });
    }

    async function submitSignUp() {
        const result = await register(toRegisterInput(values));
        downloadHtml(result.download);
        resetForm();
        navigate(buildSignupVerificationPath(result, nextPath));
    }

    async function submitSignIn() {
        const authenticatedUser = await login({
            email: values.email.trim(),
            password: values.password,
            userType: isStaff ? 'staff' : undefined,
        });

        navigate(resolvePostAuthPath(authenticatedUser, nextPath));
    }

    function renderSignUpFields() {
        return (
            <>
                <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                    <Field
                        error={fieldErrors.firstName}
                        label="First name"
                        required
                    >
                        <input
                            autoComplete="given-name"
                            className={inputClassName(
                                Boolean(fieldErrors.firstName)
                            )}
                            maxLength={NAME_MAX_LENGTH}
                            onBlur={() => {
                                setFieldError(
                                    'firstName',
                                    validateFirstNameOnBlur(values.firstName)
                                );
                            }}
                            onChange={(event) => {
                                updateValues({
                                    firstName: sanitizeFirstName(
                                        event.target.value
                                    ),
                                });
                            }}
                            placeholder="Jane"
                            value={values.firstName}
                        />
                    </Field>

                    <Field
                        error={fieldErrors.lastName}
                        label="Last name"
                        required
                    >
                        <input
                            autoComplete="family-name"
                            className={inputClassName(
                                Boolean(fieldErrors.lastName)
                            )}
                            maxLength={NAME_MAX_LENGTH}
                            onBlur={() => {
                                setFieldError(
                                    'lastName',
                                    validateLastNameOnBlur(values.lastName)
                                );
                            }}
                            onChange={(event) => {
                                updateValues({
                                    lastName: sanitizeLastName(
                                        event.target.value
                                    ),
                                });
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
                    onBlur={handlePhoneBlur}
                    onCountryChange={(phoneCountry) => {
                        updateValues({ phoneCountry });
                    }}
                    onNumberChange={(phoneNumber) => {
                        updateValues({ phoneNumber });
                    }}
                    value={values.phoneNumber}
                />

                <AddressFields
                    countryCode={values.phoneCountry}
                    errors={fieldErrors}
                    onFieldChange={handleAddressFieldChange}
                    values={values}
                />
            </>
        );
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormError(null);

        const nextFieldErrors = validateCurrentForm();
        setFieldErrors(nextFieldErrors);

        if (Object.values(nextFieldErrors).some(Boolean)) {
            return;
        }
        setIsSubmitting(true);

        try {
            if (isSignUp) {
                await submitSignUp();
                return;
            }

            await submitSignIn();
        } catch (error) {
            const nextErrorState = toAuthErrorState(error, isSignUp);
            setFieldErrors(nextErrorState.fieldErrors);
            setFormError(nextErrorState.formError);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="mx-auto grid max-w-xl gap-6">
            <PageHeader title={pageCopy.title} />

            <form
                className="grid gap-4 rounded border border-slate-200 bg-white p-5"
                noValidate
                onSubmit={handleSubmit}
            >
                {formError ? (
                    <FormNotice tone="error">{formError}</FormNotice>
                ) : null}

                {isSignUp && renderSignUpFields()}

                <Field error={fieldErrors.email} label="Email" required>
                    <input
                        autoComplete="email"
                        className={inputClassName(Boolean(fieldErrors.email))}
                        maxLength={EMAIL_MAX_LENGTH}
                        onBlur={() => {
                            // Validate the normalized email after the user leaves the field
                            // so sign-up catches formatting issues early.
                            setFieldError('email', validateEmail(values.email));
                        }}
                        onChange={handleEmailChange}
                        placeholder="jane.doe@email.com"
                        type="email"
                        value={values.email}
                    />
                </Field>

                <Field error={fieldErrors.password} label="Password" required>
                    <PasswordInput
                        autoComplete={passwordAutoComplete}
                        hasError={Boolean(fieldErrors.password)}
                        maxLength={PASSWORD_MAX_LENGTH}
                        name="password"
                        onBlur={() => {
                            if (!isSignUp || !values.password) return;

                            setFieldError(
                                'password',
                                validateCurrentForm().password
                            );
                        }}
                        onChange={handlePasswordChange}
                        onToggle={() => {
                            setShowPassword((current) => !current);
                        }}
                        placeholder={passwordPlaceholder}
                        showPassword={showPassword}
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
                            onBlur={() => {
                                setFieldError(
                                    'confirmPassword',
                                    getConfirmPasswordError(
                                        values.confirmPassword,
                                        values.password
                                    )
                                );
                            }}
                            onChange={handleConfirmPasswordChange}
                            onToggle={() => {
                                setShowConfirmPassword((current) => !current);
                            }}
                            placeholder="Re-enter your password"
                            showPassword={showConfirmPassword}
                            value={values.confirmPassword}
                        />
                    </Field>
                ) : (
                    <Link
                        className={textButtonClassName}
                        to={forgotPasswordPath}
                    >
                        Forgot password
                    </Link>
                )}

                <Button
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    type="submit"
                    variant="primary"
                >
                    {pageCopy.submitLabel}
                </Button>

                <Link
                    className={textButtonClassName}
                    to={pageCopy.switchLink.to}
                >
                    {pageCopy.switchLink.label}
                </Link>
            </form>
        </section>
    );
}

function getAuthPageCopy(mode: AuthPageMode, nextPath: string) {
    if (mode === 'signup') {
        return {
            submitLabel: 'Create account',
            switchLink: {
                label: 'Have an account? Sign in',
                to: buildSignInPath({ nextPath }),
            },
            title: 'Sign up',
        };
    }

    if (mode === 'staff') {
        return {
            submitLabel: 'Sign in',
            switchLink: {
                label: 'Not staff? Sign in here',
                to: buildSignInPath({ nextPath }),
            },
            title: 'Staff sign in',
        };
    }

    return {
        submitLabel: 'Sign in',
        switchLink: {
            label: "Don't have an account? Sign up",
            to: buildSignUpPath({ nextPath }),
        },
        title: 'Sign in',
    };
}

function getConfirmPasswordError(
    confirmPassword: string,
    password: string
): string | undefined {
    if (!confirmPassword) return 'Confirm password is required';

    return confirmPassword !== password ? 'Passwords do not match' : undefined;
}

function buildSignupVerificationPath(
    result: {
        download?: { filename: string; html: string };
        verification: { email: string };
    },
    nextPath: string
) {
    return buildVerifyEmailPath({
        context: 'signup',
        downloaded: Boolean(result.download),
        email: result.verification.email,
        nextPath,
    });
}
