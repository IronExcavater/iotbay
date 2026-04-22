import { useEffect, useState, type ChangeEvent, type SubmitEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { setAddressField, type AddressFieldName } from '../addresses/form';
import { useAuth } from '../auth/AuthProvider';
import { AuthSignUpFields } from '../auth/components/AuthSignUpFields';
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
import { Button } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { Input } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { TextLink } from '../components/form/TextLink';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtml } from '../services/download';
import { Email } from '../types/Email';
import { FirstName, LastName } from '../types/Name';
import { Password } from '../types/Password';

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
    const passwordRules = Password.rules(values.password, {
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
            email: Email.formatInput(event.target.value),
        });
    }

    function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
        const password = Password.formatInput(event.target.value);
        updateValues({ password });

        if (!isSignUp || !values.confirmPassword) return;

        setFieldError(
            'confirmPassword',
            getConfirmPasswordError(values.confirmPassword, password)
        );
    }

    function handleConfirmPasswordChange(event: ChangeEvent<HTMLInputElement>) {
        const confirmPassword = Password.formatInput(event.target.value);
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
            userType: isStaff ? 'staff' : 'customer',
        });

        navigate(resolvePostAuthPath(authenticatedUser, nextPath));
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

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
            if (nextErrorState.formError) showToast(nextErrorState.formError);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className="mx-auto grid max-w-xl gap-6">
            <PageHeader title={pageCopy.title} />

            <form
                className="bg-ui-0 border-ui-200 grid gap-3 rounded border p-5"
                noValidate
                onSubmit={handleSubmit}
            >
                {isSignUp && (
                    <AuthSignUpFields
                        fieldErrors={fieldErrors}
                        onAddressFieldChange={handleAddressFieldChange}
                        onFirstNameBlur={() => {
                            setFieldError(
                                'firstName',
                                validateCurrentForm().firstName
                            );
                        }}
                        onFirstNameChange={(value) => {
                            updateValues({
                                firstName: FirstName.formatInput(value),
                            });
                        }}
                        onLastNameBlur={() => {
                            setFieldError(
                                'lastName',
                                validateCurrentForm().lastName
                            );
                        }}
                        onLastNameChange={(value) => {
                            updateValues({
                                lastName: LastName.formatInput(value),
                            });
                        }}
                        onPhoneBlur={handlePhoneBlur}
                        onPhoneCountryChange={(phoneCountry) => {
                            updateValues({ phoneCountry });
                        }}
                        onPhoneNumberChange={(phoneNumber) => {
                            updateValues({ phoneNumber });
                        }}
                        values={values}
                    />
                )}

                <Field error={fieldErrors.email} label="Email" required>
                    <Input
                        autoComplete="email"
                        hasError={Boolean(fieldErrors.email)}
                        maxLength={Email.MAX_LENGTH}
                        onBlur={() => {
                            // Validate the normalized email after the user leaves the field
                            // so sign-up catches formatting issues early.
                            setFieldError(
                                'email',
                                Email.validate(values.email)
                            );
                        }}
                        onChange={handleEmailChange}
                        placeholder="jane.doe@email.com"
                        type="email"
                        value={values.email}
                    />
                </Field>

                <div className="grid gap-1">
                    <Field
                        error={fieldErrors.password}
                        label="Password"
                        required
                    >
                        <PasswordInput
                            autoComplete={passwordAutoComplete}
                            hasError={Boolean(fieldErrors.password)}
                            maxLength={Password.MAX_LENGTH}
                            name="password"
                            onBlur={() => {
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

                        {isSignUp && <PasswordRuleList rules={passwordRules} />}
                    </Field>

                    {!isSignUp && (
                        <TextLink to={forgotPasswordPath}>
                            Forgot password
                        </TextLink>
                    )}
                </div>

                {isSignUp && (
                    <Field
                        error={fieldErrors.confirmPassword}
                        label="Confirm password"
                        required
                    >
                        <PasswordInput
                            autoComplete="new-password"
                            hasError={Boolean(fieldErrors.confirmPassword)}
                            maxLength={Password.MAX_LENGTH}
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
                )}

                <div className="grid gap-1.5 pt-1">
                    <Button
                        disabled={isSubmitting}
                        loading={isSubmitting}
                        type="submit"
                        variant="primary"
                    >
                        {pageCopy.submitLabel}
                    </Button>

                    <TextLink
                        className="justify-self-center"
                        to={pageCopy.switchLink.to}
                    >
                        {pageCopy.switchLink.label}
                    </TextLink>
                </div>
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
