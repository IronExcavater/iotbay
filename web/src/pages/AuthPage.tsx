import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type SubmitEvent,
} from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { AddressFields } from '../addresses/AddressFields';
import { setAddressField, type AddressFieldName } from '../addresses/form';
import { useAuth } from '../auth/AuthProvider';
import { resolvePostAuthPath } from '../auth/redirects';
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
    getPasswordRules,
    NAME_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
} from '../auth/validation';
import { PasswordRuleList } from '../auth/PasswordRuleList';
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
import { Button, textButtonClassName } from '../components/form/Button';
import { Field } from '../components/form/Field';
import { FormNotice } from '../components/form/FormNotice';
import { inputClassName } from '../components/form/Input';
import { PasswordInput } from '../components/form/PasswordInput';
import { PhoneField } from '../components/form/PhoneField';
import { useEnterSubmit } from '../components/form/useEnterSubmit';
import { useToast } from '../components/toast/ToastProvider';
import { downloadHtml } from '../services/download';

function createDefaultValues(): FormValues {
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
    };
}

export default function AuthPage() {
    const formRef = useRef<HTMLFormElement | null>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, register } = useAuth();
    const { showToast } = useToast();
    const [values, setValues] = useState<FormValues>(() => createDefaultValues());
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        forgotPasswordPath,
        isSignUp,
        isStaffSignIn,
        modeSwitchPath,
        modeSwitchText,
        nextPath,
        prefilledEmail,
        submitLabel,
        title,
    } = getAuthPageState(searchParams, values.email);
    const passwordRules = getPasswordRules(values.password, {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
    });
    const passwordRulesMet = passwordRules.every((rule) => rule.met);
    const validationOptions = {
        isSignUp,
        passwordRulesMet,
    };
    const enterSubmit = useEnterSubmit({
        canSubmit: () =>
            !isSubmitting &&
            Object.values(getValidationErrors()).every((error) => !error),
        formRef,
    });

    // Query params drive which auth flow is active. When that changes, reset
    // transient form state but keep any email carried across related flows.
    useEffect(() => {
        setFieldErrors({});
        setFormError(null);
        setValues((current) => ({
            ...createDefaultValues(),
            email: prefilledEmail || current.email,
        }));
        setShowPassword(false);
        setShowConfirmPassword(false);
        if (typeof location.state?.successMessage === 'string') {
            showToast(location.state.successMessage);
            navigate(location.pathname + location.search, {
                replace: true,
                state: null,
            });
        }
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

    function updateValues(patch: Partial<FormValues>) {
        setValues((current) => ({
            ...current,
            ...patch,
        }));
    }

    function syncConfirmPasswordError(confirmPassword: string, password: string) {
        setFieldError(
            'confirmPassword',
            getConfirmPasswordError(confirmPassword, password)
        );
    }

    function handleFirstNameBlur() {
        setFieldError('firstName', validateFirstNameOnBlur(values.firstName));
    }

    function handleFirstNameChange(event: ChangeEvent<HTMLInputElement>) {
        updateValues({
            firstName: sanitizeFirstName(event.target.value),
        });
    }

    function handleLastNameBlur() {
        setFieldError('lastName', validateLastNameOnBlur(values.lastName));
    }

    function handleLastNameChange(event: ChangeEvent<HTMLInputElement>) {
        updateValues({
            lastName: sanitizeLastName(event.target.value),
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

    function handlePhoneCountryChange(country: FormValues['phoneCountry']) {
        updateValues({ phoneCountry: country });
    }

    function handlePhoneNumberChange(phoneNumber: string) {
        updateValues({ phoneNumber });
    }

    function handleAddressFieldChange(name: AddressFieldName, value: string) {
        setValues((current) => setAddressField(current, name, value));
    }

    function handleEmailBlur() {
        setFieldError('email', validateEmail(values.email));
    }

    function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
        updateValues({
            email: sanitizeEmail(event.target.value),
        });
    }

    function handlePasswordBlur() {
        if (!isSignUp || !values.password) {
            return;
        }

        setFieldError('password', getValidationErrors().password);
    }

    function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
        const nextPassword = sanitizePasswordInput(event.target.value);
        updateValues({ password: nextPassword });

        if (isSignUp && values.confirmPassword) {
            syncConfirmPasswordError(values.confirmPassword, nextPassword);
        }
    }

    function handleConfirmPasswordBlur() {
        syncConfirmPasswordError(values.confirmPassword, values.password);
    }

    function handleConfirmPasswordChange(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const nextConfirmPassword = sanitizePasswordInput(event.target.value);
        updateValues({ confirmPassword: nextConfirmPassword });
        syncConfirmPasswordError(nextConfirmPassword, values.password);
    }

    function togglePasswordVisibility() {
        setShowPassword((current) => !current);
    }

    function toggleConfirmPasswordVisibility() {
        setShowConfirmPassword((current) => !current);
    }

    function submitForm() {
        formRef.current?.requestSubmit();
    }

    function resetForm() {
        setFieldErrors({});
        setFormError(null);
        setValues(createDefaultValues());
        setShowPassword(false);
        setShowConfirmPassword(false);
    }

    const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
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
            } else {
                const authenticatedUser = await login({
                    email: values.email.trim(),
                    password: values.password,
                    userType: isStaffSignIn ? 'staff' : undefined,
                });
                navigate(resolvePostAuthPath(authenticatedUser, nextPath));
            }
        } catch (error) {
            const nextErrorState = toAuthErrorState(error, isSignUp);
            setFieldErrors(nextErrorState.fieldErrors);
            setFormError(nextErrorState.formError);
        } finally {
            setIsSubmitting(false);
        }
    };

    const signUpFields = isSignUp ? (
        <>
            <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                <Field
                    error={fieldErrors.firstName}
                    label="First name"
                    required
                >
                    <input
                        autoComplete="given-name"
                        className={inputClassName(Boolean(fieldErrors.firstName))}
                        maxLength={NAME_MAX_LENGTH}
                        onBlur={handleFirstNameBlur}
                        onChange={handleFirstNameChange}
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
                        className={inputClassName(Boolean(fieldErrors.lastName))}
                        maxLength={NAME_MAX_LENGTH}
                        onBlur={handleLastNameBlur}
                        onChange={handleLastNameChange}
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
    ) : null;

    const confirmPasswordField = isSignUp ? (
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
                onToggle={toggleConfirmPasswordVisibility}
                placeholder="Re-enter your password"
                showPassword={showConfirmPassword}
                value={values.confirmPassword}
            />
        </Field>
    ) : null;

    const forgotPasswordLink = isSignUp ? null : (
        <Link className={textButtonClassName} to={forgotPasswordPath}>
            Forgot password
        </Link>
    );

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
                {formError ? (
                    <FormNotice tone="error">{formError}</FormNotice>
                ) : null}

                {signUpFields}

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
                        autoComplete={
                            isSignUp ? 'new-password' : 'current-password'
                        }
                        hasError={Boolean(fieldErrors.password)}
                        maxLength={PASSWORD_MAX_LENGTH}
                        name="password"
                        onBlur={handlePasswordBlur}
                        onChange={handlePasswordChange}
                        onToggle={togglePasswordVisibility}
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

                {confirmPasswordField}

                {forgotPasswordLink}

                <Button
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    onClick={submitForm}
                    type="button"
                    variant="primary"
                >
                    {submitLabel}
                </Button>

                <Link className={textButtonClassName} to={modeSwitchPath}>
                    {modeSwitchText}
                </Link>
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

function getAuthPageState(searchParams: URLSearchParams, email: string) {
    // The auth screen serves customer sign-up, customer sign-in, and staff
    // sign-in from one route, so this helper keeps the route-driven labels and
    // links in one place.
    const mode = parseAuthMode(searchParams.get('mode'));
    const nextPath = searchParams.get('next')?.trim() || '/';
    const prefilledEmail = searchParams.get('email')?.trim() ?? '';
    const userType = searchParams.get('userType')?.trim() || '';
    const isStaffSignIn = userType === 'staff';
    const isSignUp = mode === 'signup' && !isStaffSignIn;
    const forgotPasswordPath = buildForgotPasswordPath(email, isStaffSignIn);

    let modeSwitchPath = '/auth?mode=signup';
    let modeSwitchText = "Don't have an account? Sign up";
    let submitLabel = 'Sign in';
    let title = 'Sign in';

    if (isStaffSignIn) {
        modeSwitchPath = '/auth?mode=signin';
        modeSwitchText = 'Not staff? Sign in here';
        title = 'Staff sign in';
    } else if (isSignUp) {
        modeSwitchPath = '/auth?mode=signin';
        modeSwitchText = 'Have an account? Sign in';
        submitLabel = 'Create account';
        title = 'Sign up';
    }

    return {
        forgotPasswordPath,
        isSignUp,
        isStaffSignIn,
        modeSwitchPath,
        modeSwitchText,
        nextPath,
        prefilledEmail,
        submitLabel,
        title,
    };
}

function buildForgotPasswordPath(email: string, isStaffSignIn: boolean) {
    const query = new URLSearchParams();
    const trimmedEmail = email.trim();

    if (trimmedEmail) {
        query.set('email', trimmedEmail);
    }
    if (isStaffSignIn) {
        query.set('userType', 'staff');
    }

    const queryString = query.toString();
    return queryString ? `/reset-password?${queryString}` : '/reset-password';
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
