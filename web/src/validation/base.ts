export interface ValidationIssue {
    code?: string;
    message: string;
}

export interface ValidationResult<TInput, TOutput> {
    error: string | null;
    input: TInput;
    issue: ValidationIssue | null;
    value: TOutput | null;
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
    formatInput(value: TInput, context?: Record<string, unknown>): TInput {
        void context;
        return value;
    }

    abstract validate(
        value: TInput,
        context?: Record<string, unknown>
    ): TOutput;

    assess(
        value: TInput,
        context?: Record<string, unknown>
    ): ValidationResult<TInput, TOutput> {
        const input = this.formatInput(value, context);

        try {
            return {
                error: null,
                input,
                issue: null,
                value: this.validate(input, context),
            };
        } catch (error) {
            if (error instanceof ValidationError) {
                return {
                    error: error.message,
                    input,
                    issue: {
                        code: error.code,
                        message: error.message,
                    },
                    value: null,
                };
            }

            throw error;
        }
    }

    tryValidate(value: TInput, context?: Record<string, unknown>) {
        const result = this.assess(value, context);

        return {
            error: result.issue ? new ValidationError(result.issue) : null,
            value: result.value,
        };
    }

    protected fail(message: string, code?: string): never {
        throw new ValidationError({ code, message });
    }
}
