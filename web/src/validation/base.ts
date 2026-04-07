export interface ValidationIssue {
    code?: string;
    message: string;
}

export class ValidationError extends Error {
    code?: string;

    constructor(issue: ValidationIssue) {
        super(issue.message);
        this.code = issue.code;
        this.name = 'ValidationError';
    }
}

export abstract class Validator<TInput, TOutput = TInput> {
    abstract validate(
        value: TInput,
        context?: Record<string, unknown>
    ): TOutput;

    tryValidate(value: TInput, context?: Record<string, unknown>) {
        try {
            return { error: null, value: this.validate(value, context) };
        } catch (error) {
            if (error instanceof ValidationError) {
                return { error, value: null };
            }
            throw error;
        }
    }

    protected fail(message: string, code?: string): never {
        throw new ValidationError({ code, message });
    }
}
