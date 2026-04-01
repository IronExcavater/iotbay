export interface PasswordRule {
    label: string;
    met: boolean;
}

interface PasswordContext {
    email?: string;
    firstName?: string;
    lastName?: string;
}

const MIN_LENGTH = 8;
const PERSONAL_INFO_MIN_LENGTH = 3;
const REPEAT_LENGTH = 3;
const SEQUENCE_LENGTH = 4;
const KEYBOARD_ROWS = [
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    '1234567890',
];

export function getPasswordRules(
    password: string,
    context: PasswordContext = {}
): PasswordRule[] {
    return [
        {
            label: 'At least 8 characters',
            met: password.length >= MIN_LENGTH,
        },
        {
            label: 'A number or symbol',
            met: hasNumberOrSymbol(password),
        },
        {
            label: 'No personal information',
            met: !containsPersonalInfo(password, context),
        },
        {
            label: 'No common patterns',
            met: !hasCommonPattern(password),
        },
    ];
}

function hasNumberOrSymbol(password: string) {
    return [...password].some(
        (character) => /\d/.test(character) || /\W|_/.test(character)
    );
}

function containsPersonalInfo(password: string, context: PasswordContext) {
    const normalizedPassword = normalize(password);
    if (!normalizedPassword) {
        return false;
    }

    return [...getPersonalTerms(context)].some((term) =>
        normalizedPassword.includes(term)
    );
}

function getPersonalTerms({
    email = '',
    firstName = '',
    lastName = '',
}: PasswordContext) {
    const terms = new Set<string>();

    for (const rawValue of [email, firstName, lastName]) {
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
    const normalizedPassword = normalize(password);
    return (
        hasRepeatedCharacters(normalizedPassword) ||
        hasRepeatedChunks(normalizedPassword) ||
        hasSequence(normalizedPassword) ||
        hasKeyboardSequence(normalizedPassword)
    );
}

function normalize(value: string) {
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

function splitTerms(value: string) {
    // Match the backend password policy: split first, then normalize.
    return value
        .split(/[\s@._-]+/)
        .map(normalize)
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
