import {
    PASSWORD_MAX_LENGTH,
    StringValidator,
} from '@shared/validation/strings';

const PASSWORD_MIN_LENGTH = 8;
const PERSONAL_INFO_MIN_LENGTH = 3;
const REPEAT_LENGTH = 3;
const SEQUENCE_LENGTH = 4;
const KEYBOARD_ROWS = [
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiop[]\\',
    'QWERTYUIOP{}|',
    "asdfghjkl;'",
    'ASDFGHJKL:',
    'zxcvbnm,./',
    'ZXCVBNM<>?',
    '`1234567890-=',
    '~!@#$%^&*()_+',
];

export interface PasswordRule {
    label: string;
    met: boolean;
}

export { PASSWORD_MAX_LENGTH };

export class PasswordValidator extends StringValidator {
    validate(value: string, context: Record<string, unknown> = {}) {
        const normalized = super.validate(value);
        if (normalized.length < PASSWORD_MIN_LENGTH) {
            this.fail(
                'password must be at least 8 characters',
                'PASSWORD_TOO_SHORT'
            );
        }
        if (!hasNumberOrSymbol(normalized)) {
            this.fail(
                'password must include a number or symbol',
                'PASSWORD_NEEDS_NUMBER_OR_SYMBOL'
            );
        }
        if (
            containsPersonalInfo(normalized, {
                email: String(context.email ?? ''),
                firstName: String(context.firstName ?? ''),
                lastName: String(context.lastName ?? ''),
            })
        ) {
            this.fail(
                'password must not contain personal information',
                'PASSWORD_HAS_PERSONAL_INFO'
            );
        }
        if (hasCommonPattern(normalized)) {
            this.fail(
                'password contains a common pattern',
                'PASSWORD_HAS_COMMON_PATTERN'
            );
        }
        return normalized;
    }

    requirements(value: string, context: Record<string, unknown> = {}) {
        return [
            {
                label: 'At least 8 characters',
                met: value.length >= PASSWORD_MIN_LENGTH,
            },
            {
                label: 'A number or symbol',
                met: hasNumberOrSymbol(value),
            },
            {
                label: 'No personal information',
                met: !containsPersonalInfo(value, {
                    email: String(context.email ?? ''),
                    firstName: String(context.firstName ?? ''),
                    lastName: String(context.lastName ?? ''),
                }),
            },
            {
                label: 'No common patterns',
                met: !hasCommonPattern(value),
            },
        ] satisfies PasswordRule[];
    }
}

function hasNumberOrSymbol(password: string) {
    return [...password].some(
        (character) => /\d/.test(character) || /\W|_/.test(character)
    );
}

function containsPersonalInfo(
    password: string,
    context: {
        email?: string;
        firstName?: string;
        lastName?: string;
    }
) {
    const canonicalPassword = canonicaliseForPersonalInfo(password);
    if (!canonicalPassword) {
        return false;
    }

    return [...getPersonalTerms(context)].some((term) =>
        canonicalPassword.includes(term)
    );
}

function getPersonalTerms({
    email = '',
    firstName = '',
    lastName = '',
}: {
    email?: string;
    firstName?: string;
    lastName?: string;
}) {
    const terms = new Set<string>();
    const emailLocalPart = email.split('@')[0] ?? '';

    for (const rawValue of [emailLocalPart, firstName, lastName]) {
        for (const part of splitTerms(rawValue)) {
            terms.add(part);
        }
    }

    const nameParts = splitTerms(firstName);
    const surnameParts = splitTerms(lastName);
    if (nameParts.length > 0 && surnameParts.length > 0) {
        terms.add([...nameParts, ...surnameParts].join(''));
        terms.add([...surnameParts, ...nameParts].join(''));
    }

    return terms;
}

function hasCommonPattern(password: string) {
    const canonicalPassword = canonicaliseForPatternMatch(password);
    return (
        hasRepeatedCharacters(canonicalPassword) ||
        hasRepeatedChunks(canonicalPassword) ||
        hasSequence(canonicalPassword) ||
        hasKeyboardSequence(canonicalPassword)
    );
}

function canonicaliseForPersonalInfo(value: string) {
    const substitutions: Record<string, string> = {
        '0': 'o',
        '1': 'i',
        '3': 'e',
        '4': 'a',
        '5': 's',
        '7': 't',
        '@': 'a',
        $: 's',
        '!': 'i',
        '+': 't',
    };

    return [...value.toLowerCase()]
        .map((character) => substitutions[character] ?? character)
        .join('')
        .replace(/[^a-z0-9]/g, '');
}

function canonicaliseForPatternMatch(value: string) {
    return value.toLowerCase().replace(/\s+/g, '');
}

function splitTerms(value: string) {
    return value
        .split(/[\s@._-]+/)
        .map(canonicaliseForPersonalInfo)
        .filter((term) => term.length >= PERSONAL_INFO_MIN_LENGTH);
}

function hasRepeatedCharacters(value: string) {
    let repeats = 1;

    for (let index = 1; index < value.length; index += 1) {
        repeats = value[index] === value[index - 1] ? repeats + 1 : 1;
        if (repeats >= REPEAT_LENGTH) {
            return true;
        }
    }

    return false;
}

function hasRepeatedChunks(value: string) {
    for (let size = 1; size <= Math.floor(value.length / 2); size += 1) {
        if (value.length % size !== 0) {
            continue;
        }

        const chunk = value.slice(0, size);
        if (chunk.repeat(value.length / size) === value) {
            return true;
        }
    }

    return false;
}

function hasSequence(value: string) {
    for (let start = 0; start <= value.length - SEQUENCE_LENGTH; start += 1) {
        const window = value.slice(start, start + SEQUENCE_LENGTH);
        if (isStepSequence(window, 1) || isStepSequence(window, -1)) {
            return true;
        }
    }

    return false;
}

function isStepSequence(value: string, step: number) {
    for (let index = 0; index < value.length - 1; index += 1) {
        if (value.charCodeAt(index + 1) - value.charCodeAt(index) !== step) {
            return false;
        }
    }

    return true;
}

function hasKeyboardSequence(value: string) {
    return KEYBOARD_ROWS.some(
        (row) =>
            containsSequence(row, value) ||
            containsSequence([...row].reverse().join(''), value)
    );
}

function containsSequence(source: string, value: string) {
    for (let start = 0; start <= value.length - SEQUENCE_LENGTH; start += 1) {
        if (source.includes(value.slice(start, start + SEQUENCE_LENGTH))) {
            return true;
        }
    }

    return false;
}
