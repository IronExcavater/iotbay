export interface PasswordRule {
    label: string;
    met: boolean;
}

export function getPasswordRules(password: string): PasswordRule[] {
    return [
        {
            label: 'At least 8 characters',
            met: password.length >= 8,
        },
        {
            label: 'Upper and lower case letters',
            met: /[A-Z]/.test(password) && /[a-z]/.test(password),
        },
        {
            label: 'A number or symbol',
            met: /\d/.test(password) || /[^A-Za-z0-9]/.test(password),
        },
    ];
}
