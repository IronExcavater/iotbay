type HttpMethod = 'GET' | 'POST';
type JsonObject = Record<string, unknown>;

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

export function getJson<TResponse>(path: string, signal?: AbortSignal) {
    return requestJson<TResponse>(path, { signal });
}

export function postJson<TResponse, TBody = undefined>(
    path: string,
    body?: TBody,
    signal?: AbortSignal
) {
    return requestJson<TResponse, TBody>(path, {
        body,
        method: 'POST',
        signal,
    });
}

export function getResponseField<TValue>(
    payload: object,
    field: string
): TValue {
    if (!(field in payload)) {
        throw new Error(`Expected response field "${field}" to exist`);
    }

    return (payload as JsonObject)[field] as TValue;
}

async function requestJson<TResponse, TBody = undefined>(
    path: string,
    options: RequestOptions<TBody> = {}
): Promise<TResponse> {
    const response = await fetch(path, buildRequestInit(options));
    const payload = await readPayload(response);

    if (!response.ok) {
        throw toBackendError(response, payload);
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

function toBackendError(response: Response, payload: unknown) {
    if (isRecord(payload) && typeof payload.error === 'string') {
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

function isRecord(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null;
}
