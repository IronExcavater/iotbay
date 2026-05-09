type HttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST';

const apiKey = readEnvString('IOTBAY_API_KEY');

interface RequestOptions<TBody> {
    body?: TBody;
    method?: HttpMethod;
    signal?: AbortSignal;
}

export class BackendError extends Error {
    code?: string;
    status: number;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.code = code;
        this.name = 'BackendError';
        this.status = status;
    }
}

type BackendErrorResolver<T> = (error: BackendError) => T;

const BACKEND_ERROR_MESSAGES: Record<string, string> = {
    ADDRESS_INVALID: 'Invalid address',
    ADDRESS_LOOKUP_UNAVAILABLE: 'Address lookup unavailable',
    API_KEY_INVALID: 'App access denied',
    API_KEY_REQUIRED: 'App access missing',
    CURRENT_PASSWORD_INCORRECT: 'Incorrect password',
    CURRENT_PASSWORD_REQUIRED: 'Password required',
    CUSTOMER_ACCOUNT_REQUIRED: 'Use staff sign in',
    EMAIL_EXISTS: 'Email already used',
    EMAIL_NOT_VERIFIED: 'Verify your email',
    EMAIL_VERIFICATION_PENDING: 'Verification already pending',
    INVALID_CREDENTIALS: 'Incorrect email or password',
    INVALID_EMAIL_VERIFICATION_TOKEN: 'Invalid verification link',
    INVALID_LOGIN_MFA_CHALLENGE: 'Invalid or expired code',
    INVALID_STAFF_INVITATION_TOKEN: 'Invalid staff invitation',
    INVALID_PASSWORD_RESET_TOKEN: 'Invalid reset link',
    LOGIN_MFA_ATTEMPTS_EXCEEDED: 'Too many code attempts',
    PASSWORD_HAS_COMMON_PATTERN: 'Avoid common patterns',
    PASSWORD_HAS_PERSONAL_INFO: 'Avoid personal details',
    PASSWORD_NEEDS_NUMBER_OR_SYMBOL: 'Add number or symbol',
    PASSWORD_TOO_SHORT: 'Use 8+ characters',
    PHONE_COUNTRY_INVALID: 'Invalid phone number',
    PHONE_NUMBER_INVALID: 'Invalid phone number',
    PRODUCT_CODE_EXISTS: 'Code already exists',
    PRODUCT_CODE_INVALID: 'Invalid product code',
    PRODUCT_CODE_REQUIRED: 'Code is required',
    PRODUCT_CODE_TOO_LONG: 'Code is too long',
    PRODUCT_ID_INVALID: 'Invalid product',
    PRODUCT_NAME_INVALID: 'Invalid product name',
    PRODUCT_NAME_REQUIRED: 'Name is required',
    PRODUCT_NAME_TOO_LONG: 'Name is too long',
    PRODUCT_NOT_FOUND: 'Product not found',
    PRODUCT_PRICE_INVALID: 'Invalid price',
    PRODUCT_PRICE_TOO_LARGE: 'Price is too large',
    STAFF_ACCOUNT_REQUIRED: 'Staff account required',
    STAFF_PERMISSION_REQUIRED: 'Admin access required',
    SESSION_NOT_FOUND: 'Session not found',
    USER_MANAGEMENT_NOT_ALLOWED: 'You cannot manage that user',
    USER_NOT_FOUND: 'User not found',
    USER_PERMISSION_ESCALATION_NOT_ALLOWED: 'You cannot assign that permission',
    INVALID_STATUS_TRANSITION: 'This status change is not allowed',
    ORDER_NOT_FOUND: 'Order not found',
};

export function backendErrorMessage(
    code?: string,
    fallback = 'Something went wrong'
) {
    return (code && BACKEND_ERROR_MESSAGES[code]) || fallback;
}

export function resolveBackendError<T>(
    error: unknown,
    handlers: Partial<Record<string, BackendErrorResolver<T>>>,
    fallback: (message: string, error?: BackendError) => T
) {
    if (error instanceof BackendError) {
        const handler = error.code ? handlers[error.code] : undefined;
        if (handler) {
            return handler(error);
        }

        return fallback(
            backendErrorMessage(error.code, normalizeMessage(error.message)),
            error
        );
    }

    if (error instanceof Error) {
        return fallback(normalizeMessage(error.message));
    }

    return fallback('Something went wrong');
}

export function toErrorMessage(
    error: unknown,
    fallback = 'Something went wrong'
) {
    if (error instanceof BackendError) {
        return backendErrorMessage(
            error.code,
            normalizeMessage(error.message, fallback)
        );
    }

    if (error instanceof Error) {
        return normalizeMessage(error.message, fallback);
    }

    return fallback;
}

export function normalizeMessage(
    value: string,
    fallback = 'Something went wrong'
) {
    const trimmed = value.trim().replace(/\.+$/, '');
    if (!trimmed) {
        return fallback;
    }

    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function getJson<TResponse>(path: string, signal?: AbortSignal) {
    return requestJson<TResponse>(path, { signal });
}

export function postJson<TResponse, TBody = undefined>(
    path: string,
    body?: TBody,
    signal?: AbortSignal
) {
    return requestJson<TResponse>(path, {
        body,
        method: 'POST',
        signal,
    });
}

export function patchJson<TResponse, TBody>(
    path: string,
    body: TBody,
    signal?: AbortSignal
) {
    return requestJson<TResponse>(path, {
        body,
        method: 'PATCH',
        signal,
    });
}

export function deleteJson(path: string, signal?: AbortSignal) {
    return requestJson<void>(path, {
        method: 'DELETE',
        signal,
    });
}

export function deleteJsonResponse<TResponse>(
    path: string,
    signal?: AbortSignal
) {
    return requestJson<TResponse>(path, {
        method: 'DELETE',
        signal,
    });
}

function readEnvString(name: string) {
    const value = (import.meta.env as Record<string, unknown>)[name];
    return typeof value === 'string' ? value.trim() : '';
}

async function requestJson<TResponse>(
    path: string,
    options: RequestOptions<unknown> = {}
): Promise<TResponse> {
    const response = await fetch(path, buildRequestInit(options));
    const payload = await readPayload(response);

    if (!response.ok) {
        throw createBackendError(response, payload);
    }

    return payload as TResponse;
}

function buildRequestInit<TBody>({
    body,
    method = 'GET',
    signal,
}: RequestOptions<TBody>): RequestInit {
    // The backend authenticates browser sessions with an HttpOnly cookie, so
    // every request must opt in to sending and receiving credentials.
    return {
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'include',
        headers: buildHeaders(body),
        method,
        signal,
    };
}

function buildHeaders(body: unknown) {
    const headers: Record<string, string> = {};

    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }
    if (apiKey) {
        // The web app and API share the same workspace .env file in local
        // development, so the browser forwards the configured access key too.
        headers['x-api-key'] = apiKey;
    }

    return Object.keys(headers).length > 0 ? headers : undefined;
}

async function readPayload(response: Response): Promise<unknown> {
    if (response.status === 204) {
        return undefined;
    }

    return response.json().catch(() => null);
}

function createBackendError(response: Response, payload: unknown) {
    if (hasError(payload)) {
        return new BackendError(
            payload.error,
            response.status,
            typeof payload.code === 'string' ? payload.code : undefined
        );
    }

    return new BackendError(
        response.statusText || `Request failed with status ${response.status}`,
        response.status
    );
}

function hasError(
    payload: unknown
): payload is { code?: string; error: string } {
    return (
        typeof payload === 'object' &&
        payload !== null &&
        'error' in payload &&
        typeof payload.error === 'string'
    );
}
