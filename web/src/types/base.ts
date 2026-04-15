import type { ValidationResult } from '../validation/base';

export interface ValueContext {
    [key: string]: unknown;
}

export interface InputValueType<TContext = void> {
    formatInput(value: string, context?: TContext): string;
    caretPosition?(
        value: string,
        selectionStart: number,
        context?: TContext
    ): number;
}

export interface AssessValueType<TInput, TOutput, TContext = void> {
    assess(value: TInput, context?: TContext): ValidationResult<TInput, TOutput>;
}

export function parseValue<TInput, TOutput, TInstance, TContext = void>(
    type: AssessValueType<TInput, TOutput, TContext>,
    value: TInput,
    create: (value: TOutput) => TInstance,
    context?: TContext
) {
    const assessment = type.assess(value, context);
    return assessment.value === null ? null : create(assessment.value);
}

export function validateValue<TInput, TOutput, TContext = void>(
    type: AssessValueType<TInput, TOutput, TContext>,
    value: TInput,
    context?: TContext
) {
    return type.assess(value, context).error;
}
