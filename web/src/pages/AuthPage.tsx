import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
    Link,
    Navigate,
    useLocation,
    useNavigate,
    useSearchParams,
} from 'react-router-dom';

import { AddressFields } from '../addresses/AddressFields';
import { setAddressField } from '../addresses/form';
import { authApi } from '../auth/api';
import { useAuth } from '../auth/AuthProvider';
import {
    parseAuthMode,
    toAuthErrorState,
    toRegisterInput,
    type AuthFieldErrors as FieldErrors,
    type AuthFormValues as FormValues,
    validateAuthForm,
} from '../auth/form';
import {
    EMAIL_MAX_LENGTH,
    NAME_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
} from '../auth/limits';
import { PasswordRuleList } from '../auth/PasswordRuleList';
import { getPasswordRules } from '../auth/passwordRules';
import { getBrowserPhoneCountry, validatePhoneNumber } from '../auth/phone';
import {
    sanitizeEmail,
    sanitizeFirstName,
    sanitizeLastName,
    sanitizePasswordInput,
    validateEmail,
    validateFirstNameOnBlur,
    validateLastNameOnBlur,
} from '../auth/validation';
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { PhoneField } from '../components/form/PhoneField';
import { useEnterSubmit } from '../components/form/useEnterSubmit';
import { downloadFile } from '../services/download';

const DEFAULT_VALUES: FormValues = {
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
};

export default function AuthPage() {
    const formRef = useRef<HTMLFormElement | null>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isAuthenticated, isLoading, login } = useAuth();
    const [values, setValues] = useState<FormValues>(DEFAULT_VALUES);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const mode = parseAuthMode(searchParams.get('mode'));
    const prefilledEmail = searchParams.get('email')?.trim() ?? '';
    const nextPath = searchParams.get('next')?.trim() || '/';
    const userType = searchParams.get('userType')?.trim() || '';
    const isStaffSignIn = userType === 'staff';
    const isSignUp = mode === 'signup' && !isStaffSignIn;
    const forgotPasswordPath = `/reset-password?email=${encodeURIComponent(values.email.trim())}${isStaffSignIn ? '&userType=staff' : ''}`;
    const passwordRules = getPasswordRules(values.password, {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
    });
    const title = isStaffSignIn
        ? 'Staff sign in'
        : isSignUp
          ? 'Sign up'
          : 'Sign in';
    const submitLabel = isSignUp ? 'Create account' : 'Sign in';
    const enterSubmit = useEnterSubmit({
        canSubmit: () =>
            !isSubmitting &&
            Object.values(
                validateAuthForm(values, {
                    isSignUp,
                    passwordRulesMet: passwordRules.every((rule) => rule.met),
                })
            ).every((error) => !error),
        formRef,
    });

    useEffect(() => {
        // Reset transient auth-page state whenever the auth route mode changes,
        // while still carrying a query-provided email through related flows.
        setFieldErrors({});
        setFormError(null);
        setSuccessMessage(
            typeof location.state?.successMessage === 'string'
                ? location.state.successMessage
                : null
        );
        setValues((current) => ({
            ...DEFAULT_VALUES,
            email: prefilledEmail || current.email,
        }));
        setShowPassword(false);
        setShowConfirmPassword(false);
    }, [location.search, location.state, prefilledEmail]);

    if (!isLoading && isAuthenticated) {
        return <Navigate replace to={nextPath} />;
    }

    function setFieldError(name: keyof FieldErrors, error?: string | null) {
        setFieldErrors((current) => ({
            ...current,
            [name]: error || undefined,
        }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const nextFieldErrors = validateAuthForm(values, {
            isSignUp,
            passwordRulesMet: passwordRules.every((rule) => rule.met),
        });
        setFieldErrors(nextFieldErrors);
        setSuccessMessage(null);

        if (Object.values(nextFieldErrors).some(Boolean)) {
            setFormError('Check the highlighted fields');
            return;
        }

        setFormError(null);
        setIsSubmitting(true);
        try {
            if (isSignUp) {
                const result = await authApi.register(toRegisterInput(values));
                setFieldErrors({});
                setFormError(null);
                if (result.download) {
                    downloadFile(
                        result.download.filename,
                        result.download.html,
                        'text/html;charset=utf-8'
                    );
                }
                setSuccessMessage(null);
                setValues(DEFAULT_VALUES);
                setShowPassword(false);
                setShowConfirmPassword(false);
                navigate(
                    `/verify-email?email=${encodeURIComponent(result.verification.email)}&context=signup${result.download ? '&downloaded=1' : ''}`
                );
            } else {
                await login({
                    email: values.email.trim(),
                    password: values.password,
                    userType: isStaffSignIn ? 'staff' : undefined,
                });
                navigate(nextPath);
            }
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
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
            </h1>

            <form
                className="grid gap-4 rounded border border-slate-200 bg-white p-5"
                noValidate
                onKeyDown={enterSubmit.onKeyDown}
                onSubmit={handleSubmit}
                ref={formRef}
            >
                {successMessage ? (
                    <FormNotice tone="success">{successMessage}</FormNotice>
                ) : null}
                {formError ? (
                    <FormNotice tone="error">{formError}</FormNotice>
                ) : null}

                {isSignUp ? (
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
                                        validateFirstNameOnBlur(
                                            values.firstName
                                        )
                                    );
                                }}
                                onChange={(event) => {
                                    setValues((current) => ({
                                        ...current,
                                        firstName: sanitizeFirstName(
                                            event.target.value
                                        ),
                                    }));
                                    setSuccessMessage(null);
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
                                    setValues((current) => ({
                                        ...current,
                                        lastName: sanitizeLastName(
                                            event.target.value
                                        ),
                                    }));
                                    setSuccessMessage(null);
                                }}
                                placeholder="Doe"
                                value={values.lastName}
                            />
                        </Field>
                    </div>
                ) : null}

                {isSignUp ? (
                    <>
                        <PhoneField
                            country={values.phoneCountry}
                            error={fieldErrors.phoneNumber}
                            label="Phone number"
                            onBlur={() => {
                                setFieldError(
                                    'phoneNumber',
                                    values.phoneNumber.trim()
                                        ? validatePhoneNumber(
                                              values.phoneNumber,
                                              values.phoneCountry
                                          )
                                        : null
                                );
                            }}
                            onCountryChange={(country) => {
                                setValues((current) => ({
                                    ...current,
                                    phoneCountry: country,
                                }));
                                setSuccessMessage(null);
                            }}
                            onNumberChange={(value) => {
                                setValues((current) => ({
                                    ...current,
                                    phoneNumber: value,
                                }));
                                setSuccessMessage(null);
                            }}
                            value={values.phoneNumber}
                        />

                        <AddressFields
                            countryCode={values.phoneCountry}
                            errors={fieldErrors}
                            onFieldChange={(name, value) => {
                                setValues((current) =>
                                    setAddressField(current, name, value)
                                );
                                setSuccessMessage(null);
                            }}
                            values={values}
                        />
                    </>
                ) : null}

                <Field error={fieldErrors.email} label="Email" required>
                    <input
                        autoComplete="email"
                        className={inputClassName(Boolean(fieldErrors.email))}
                        maxLength={EMAIL_MAX_LENGTH}
                        onBlur={() => {
                            setFieldError('email', validateEmail(values.email));
                        }}
                        onChange={(event) => {
                            setValues((current) => ({
                                ...current,
                                email: sanitizeEmail(event.target.value),
                            }));
                            setSuccessMessage(null);
                        }}
                        placeholder="jane.doe@email.com"
                        type="email"
                        value={values.email}
                    />
                </Field>

                <Field error={fieldErrors.password} label="Password" required>
                    <PasswordInput
                        autoComplete={
                            isSignUp ? 'new-password' : 'current-password'
                        }
                        hasError={Boolean(fieldErrors.password)}
                        maxLength={PASSWORD_MAX_LENGTH}
                        onBlur={() => {
                            if (!isSignUp || !values.password) {
                                return;
                            }
                            const passwordError = validateAuthForm(values, {
                                isSignUp: true,
                                passwordRulesMet: passwordRules.every(
                                    (rule) => rule.met
                                ),
                            }).password;
                            setFieldError('password', passwordError);
                        }}
                        onChange={(event) => {
                            const nextPassword = sanitizePasswordInput(
                                event.target.value
                            );
                            setValues((current) => ({
                                ...current,
                                password: nextPassword,
                            }));
                            setSuccessMessage(null);
                            if (isSignUp && values.confirmPassword) {
                                setFieldError(
                                    'confirmPassword',
                                    getConfirmPasswordError(
                                        values.confirmPassword,
                                        nextPassword
                                    )
                                );
                            }
                        }}
                        onToggle={() => {
                            setShowPassword((current) => !current);
                        }}
                        placeholder={
                            isSignUp
                                ? 'Choose a password'
                                : 'Enter your password'
                        }
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
                            onBlur={() => {
                                setFieldError(
                                    'confirmPassword',
                                    getConfirmPasswordError(
                                        values.confirmPassword,
                                        values.password
                                    )
                                );
                            }}
                            onChange={(event) => {
                                const nextConfirmPassword =
                                    sanitizePasswordInput(event.target.value);
                                setValues((current) => ({
                                    ...current,
                                    confirmPassword: nextConfirmPassword,
                                }));
                                setSuccessMessage(null);
                                setFieldError(
                                    'confirmPassword',
                                    getConfirmPasswordError(
                                        nextConfirmPassword,
                                        values.password
                                    )
                                );
                            }}
                            onToggle={() => {
                                setShowConfirmPassword((current) => !current);
                            }}
                            placeholder="Re-enter your password"
                            showPassword={showConfirmPassword}
                            value={values.confirmPassword}
                        />
                    </Field>
                ) : null}

                {!isSignUp ? (
                    <Link
                        className="text-sm text-slate-600 underline"
                        to={forgotPasswordPath}
                    >
                        Forgot password
                    </Link>
                ) : null}

                <Button
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    onClick={() => {
                        formRef.current?.requestSubmit();
                    }}
                    type="button"
                    variant="primary"
                >
                    {submitLabel}
                </Button>

                {isStaffSignIn ? (
                    <p className="text-sm text-slate-600">
                        Not staff?{' '}
                        <Link className="underline" to="/auth?mode=signin">
                            Sign in here
                        </Link>
                    </p>
                ) : isSignUp ? (
                    <p className="text-sm text-slate-600">
                        Have an account?{' '}
                        <Link className="underline" to="/auth?mode=signin">
                            Sign in
                        </Link>
                    </p>
                ) : (
                    <p className="text-sm text-slate-600">
                        Don&apos;t have an account?{' '}
                        <Link className="underline" to="/auth?mode=signup">
                            Sign up
                        </Link>
                    </p>
                )}
            </form>
        </section>
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
