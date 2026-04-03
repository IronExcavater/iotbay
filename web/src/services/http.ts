type HttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST';

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

export function toErrorMessage(
    error: unknown,
    fallback = 'Something went wrong.'
) {
    if (error instanceof BackendError) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
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
    return {
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'include',
        headers:
            body === undefined
                ? undefined
                : { 'Content-Type': 'application/json' },
        method,
        signal,
    };
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
