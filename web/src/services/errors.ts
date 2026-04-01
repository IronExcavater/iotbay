import { BackendError } from './http';

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
